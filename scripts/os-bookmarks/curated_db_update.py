import os
import pickle
import json
import requests
import base64
# Conditional import for dotenv
try:
    from dotenv import load_dotenv
    HAS_DOTENV = True
except ModuleNotFoundError:
    HAS_DOTENV = False
from pathlib import Path
# Conditional import for psycopg2
try:
    import psycopg2
    from psycopg2.extras import execute_values, Json
    HAS_PSYCOPG2 = True
except ModuleNotFoundError:
    HAS_PSYCOPG2 = False
import sys

from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"]
API_SERVICE_NAME = "youtube"
API_VERSION = "v3"
SCRIPT_DIR = Path(__file__).resolve().parent

if HAS_DOTENV:
    dotenv_path_script_dir = SCRIPT_DIR / '.env'
    dotenv_path_cwd = Path.cwd() / '.env'
    dotenv_path_root = SCRIPT_DIR.parent.parent / '.env'

    if dotenv_path_script_dir.exists():
        load_dotenv(dotenv_path=dotenv_path_script_dir)
        print(f"Loaded .env file from {dotenv_path_script_dir}")
    elif dotenv_path_cwd.exists():
        load_dotenv(dotenv_path=dotenv_path_cwd)
        print(f"Loaded .env file from {dotenv_path_cwd}")
    elif dotenv_path_root.exists():
        load_dotenv(dotenv_path=dotenv_path_root)
        print(f"Loaded .env file from {dotenv_path_root}")
    else:
        print("Info: .env file not found. Relying on shell environment variables.", file=sys.stderr)
else:
    print("Warning: python-dotenv module not found. Relying solely on shell/system-set environment variables.", file=sys.stderr)


DB_HOST = os.getenv("SUPABASE_DB_HOST")
DB_NAME = os.getenv("SUPABASE_DB_NAME", "postgres")
DB_USER = os.getenv("SUPABASE_DB_USER", "postgres")
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")
DB_PORT = os.getenv("SUPABASE_DB_PORT", "5432")

X_CLIENT_ID = os.getenv("X_CLIENT_ID")
X_CLIENT_SECRET = os.getenv("X_CLIENT_SECRET")
X_REFRESH_TOKEN = os.getenv("X_REFRESH_TOKEN")
X_TOKEN_URL = "https://api.x.com/2/oauth2/token"

def trigger_vercel_deploy(hook_url):
    if not hook_url:
        print("Info: VERCEL_DEPLOY_HOOK_URL not set. Skipping Vercel build trigger.", file=sys.stderr)
        return
    try:
        print(f"Attempting to trigger Vercel deploy hook: {hook_url[:30]}... (URL truncated for safety)")
        response = requests.post(hook_url) # No data/payload needed for Vercel deploy hooks
        response.raise_for_status() # Raises an HTTPError for bad responses (4XX or 5XX)
        print(f"Vercel deploy hook triggered successfully. Status: {response.status_code}")
        # Example response from Vercel: {"job": {"id": "...", "state": "PENDING", "createdAt": ...}}
        print(f"Vercel response: {response.json()}")
    except requests.exceptions.RequestException as e:
        print(f"Error triggering Vercel deploy hook: {e}", file=sys.stderr)
    except json.JSONDecodeError as e:
        print(f"Error decoding Vercel deploy hook response: {e}. Response text: {response.text[:200]}", file=sys.stderr)

def get_authenticated_service():
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN")

    if all([client_id, client_secret, refresh_token]):
        print("Attempting authentication using environment variables (GitHub Secrets)...")
        credentials = Credentials(
            None,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret,
            scopes=SCOPES
        )
        try:
            credentials.refresh(Request())
        except Exception as e:
            print(f"Error refreshing token using environment variables: {e}")
            raise Exception("Failed to refresh token using environment variables.") from e

        if not credentials or not credentials.valid:
             raise Exception("Could not obtain valid credentials after refresh using environment variables.")
        print("Authentication successful using environment variables.")
        return build(API_SERVICE_NAME, API_VERSION, credentials=credentials)
    else:
        print("Environment variables for Google OAuth not found. Attempting local file-based authentication...")
        CLIENT_SECRETS_FILE = str(SCRIPT_DIR / "client_secrets.json")
        TOKEN_PICKLE_FILE = str(SCRIPT_DIR / "token.pickle")
        # Import only if needed for fallback
        from google_auth_oauthlib.flow import InstalledAppFlow

        credentials = None
        if os.path.exists(TOKEN_PICKLE_FILE):
            with open(TOKEN_PICKLE_FILE, "rb") as token:
                credentials = pickle.load(token)
        if not credentials or not credentials.valid:
            if credentials and credentials.expired and credentials.refresh_token:
                try:
                    credentials.refresh(Request())
                except Exception as e:
                     print(f"Error refreshing local token: {e}. Deleting token file.")
                     if os.path.exists(TOKEN_PICKLE_FILE):
                         os.remove(TOKEN_PICKLE_FILE)
                     credentials = None # Force re-authentication

            if not credentials or not credentials.valid: # Check again after potential refresh
                if not os.path.exists(CLIENT_SECRETS_FILE):
                     raise FileNotFoundError(f"Local authentication failed: {CLIENT_SECRETS_FILE} not found and no valid token.")

                flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
                try:
                    credentials = flow.run_local_server(port=0)
                except Exception as e:
                    raise Exception(f"Local OAuth flow failed: {e}") from e
            # Save the credentials for the next run
            with open(TOKEN_PICKLE_FILE, "wb") as token:
                pickle.dump(credentials, token)
        print("Authentication successful using local files.")
        return build(API_SERVICE_NAME, API_VERSION, credentials=credentials)

def get_liked_videos(youtube):
    liked_videos = []
    next_page_token = None
    while True:
        request = youtube.playlistItems().list(
            part="snippet,contentDetails",
            playlistId="LL",
            maxResults=50,
            pageToken=next_page_token
        )
        response = request.execute()
        for item in response.get("items", []):
            snippet = item.get("snippet", {})
            content_details = item.get("contentDetails", {})
            thumbnails = snippet.get("thumbnails", {})
            video_id = content_details.get("videoId")
            video_title = snippet.get("title", "No Title")
            video_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else "No URL"
            video_owner_channel_id = snippet.get("videoOwnerChannelId", "No Owner Channel ID")
            video_owner_channel_title = snippet.get("videoOwnerChannelTitle", "No Owner Channel Title")
            published_at = snippet.get("publishedAt", "No Date")
            thumbnail_url = thumbnails.get("high", {}).get("url") or \
                            thumbnails.get("medium", {}).get("url") or \
                            thumbnails.get("default", {}).get("url", "No Thumbnail")
            if video_id: # Only add if we have a valid video ID
                liked_videos.append({
                    "title": video_title,
                    "url": video_url,
                    "video_owner_channel_id": video_owner_channel_id,
                    "video_owner_channel_title": video_owner_channel_title,
                    "published_at": published_at,
                    "thumbnail_url": thumbnail_url
                })
        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break # Exit the loop if there are no more pages
    return liked_videos

def get_github_stars(username, token):
    all_repos = []
    url = f"https://api.github.com/users/{username}/starred?per_page=100&sort=created&direction=desc"
    headers = {
        "Accept": "application/vnd.github.star+json",
        "Authorization": f"token {token}" if token else None
    }
    if headers["Authorization"] is None:
        del headers["Authorization"]

    while url:
        try:
            print(f"Fetching GitHub stars page: {url}")
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            page_data = response.json()
            if not isinstance(page_data, list):
                print(f"Warning: Expected a list but got {type(page_data)}. Stopping pagination.", file=sys.stderr)
                break
            for repo_raw in page_data:
                repo_minimal = {
                    "id": repo_raw.get("repo", {}).get("id"),
                    "full_name": repo_raw.get("repo", {}).get("full_name"),
                    "html_url": repo_raw.get("repo", {}).get("html_url"),
                    "description": repo_raw.get("repo", {}).get("description"),
                    "language": repo_raw.get("repo", {}).get("language"),
                    "stargazers_count": repo_raw.get("repo", {}).get("stargazers_count"),
                    "forks_count": repo_raw.get("repo", {}).get("forks_count"),
                    "pushed_at": repo_raw.get("repo", {}).get("pushed_at"),
                    "owner": {
                        "login": repo_raw.get("repo", {}).get("owner", {}).get("login"),
                        "avatar_url": repo_raw.get("repo", {}).get("owner", {}).get("avatar_url")
                    },
                    "starred_at": repo_raw.get("starred_at")
                }
                if repo_minimal["id"] and repo_minimal["html_url"]:
                     all_repos.append(repo_minimal)
                else:
                    print(f"Warning: Skipping repo due to missing id or html_url. Raw data snippet: {str(repo_raw)[:200]}...", file=sys.stderr)

            if 'Link' in response.headers:
                links = requests.utils.parse_header_links(response.headers['Link'])
                next_link = next((link['url'] for link in links if link.get('rel') == 'next'), None)
                url = next_link
            else:
                url = None
        except requests.exceptions.RequestException as e:
            print(f"Error during GitHub API request: {e}", file=sys.stderr)
            raise
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON response from GitHub: {e}", file=sys.stderr)
            print(f"Response content: {response.text[:500]}...", file=sys.stderr)
            raise
    return all_repos

def get_github_star_lists_by_repo_id(username, token):
    """
    Build a map of REST repo id (GitHub databaseId) -> Star List names for that user.

    The REST API for starred repos does not include GitHub "Stars lists" membership.
    That data is only available via the GraphQL API (UserList / Repository).

    Returns:
        dict[int, list[str]] on success (may be empty if the user has no lists).
        None if GraphQL failed (auth, scope, or API errors) so callers can preserve DB values.
    """
    if not token or not username:
        print(
            "Info: Skipping GitHub Star Lists GraphQL (GH_TOKEN or GH_USER missing).",
            file=sys.stderr,
        )
        return None

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    endpoint = "https://api.github.com/graphql"
    repo_to_lists = {}

    lists_query = """
    query ($login: String!, $after: String) {
      user(login: $login) {
        lists(first: 50, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            name
          }
        }
      }
    }
    """

    items_query = """
    query ($id: ID!, $after: String) {
      node(id: $id) {
        ... on UserList {
          items(first: 100, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              ... on Repository {
                databaseId
              }
            }
          }
        }
      }
    }
    """

    lists_after = None
    try:
        while True:
            r = requests.post(
                endpoint,
                json={"query": lists_query, "variables": {"login": username, "after": lists_after}},
                headers=headers,
                timeout=90,
            )
            r.raise_for_status()
            payload = r.json()
            if payload.get("errors"):
                print(
                    f"GitHub GraphQL (lists) errors: {payload['errors']}",
                    file=sys.stderr,
                )
                return None
            user_data = (payload.get("data") or {}).get("user")
            if not user_data:
                print("GitHub GraphQL: user not found or lists unavailable.", file=sys.stderr)
                return None
            conn = user_data.get("lists") or {}
            for node in conn.get("nodes") or []:
                list_id = node.get("id")
                list_name = node.get("name")
                if not list_id or not list_name:
                    continue
                items_after = None
                while True:
                    r2 = requests.post(
                        endpoint,
                        json={
                            "query": items_query,
                            "variables": {"id": list_id, "after": items_after},
                        },
                        headers=headers,
                        timeout=90,
                    )
                    r2.raise_for_status()
                    payload2 = r2.json()
                    if payload2.get("errors"):
                        print(
                            f"GitHub GraphQL (list items) errors: {payload2['errors']}",
                            file=sys.stderr,
                        )
                        return None
                    node_data = (payload2.get("data") or {}).get("node") or {}
                    items_conn = node_data.get("items") or {}
                    for item in items_conn.get("nodes") or []:
                        rid = item.get("databaseId")
                        if rid is None:
                            continue
                        rid = int(rid)
                        repo_to_lists.setdefault(rid, set()).add(list_name)
                    pinfo = items_conn.get("pageInfo") or {}
                    if pinfo.get("hasNextPage") and pinfo.get("endCursor"):
                        items_after = pinfo["endCursor"]
                    else:
                        break

            lp = conn.get("pageInfo") or {}
            if lp.get("hasNextPage") and lp.get("endCursor"):
                lists_after = lp["endCursor"]
            else:
                break
    except requests.exceptions.RequestException as e:
        print(f"GitHub GraphQL request failed: {e}", file=sys.stderr)
        return None

    # sorted stable output for DB / diffs
    return {k: sorted(v) for k, v in repo_to_lists.items()}

def update_env_file(key, value):
    """Updates or adds a key-value pair in the root .env file."""
    dotenv_path = SCRIPT_DIR.parent.parent / '.env'
    if not dotenv_path.exists():
        return
    
    lines = []
    found = False
    with open(dotenv_path, "r") as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if line.strip().startswith(f"{key}="):
            new_lines.append(f"{key}={value}\n")
            found = True
        else:
            new_lines.append(line)
    
    if not found:
        new_lines.append(f"{key}={value}\n")
        
    with open(dotenv_path, "w") as f:
        f.writelines(new_lines)
    print(f"Updated {key} in {dotenv_path}")

def refresh_x_token():
    if not X_CLIENT_ID or not X_CLIENT_SECRET or not X_REFRESH_TOKEN:
         print("Error: X_CLIENT_ID, X_CLIENT_SECRET, or X_REFRESH_TOKEN not found in env.", file=sys.stderr)
         return None

    print("Refreshing X access token...")
    auth = base64.b64encode(f"{X_CLIENT_ID}:{X_CLIENT_SECRET}".encode("utf-8")).decode("utf-8")
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": f"Basic {auth}"
    }
    data = {
        "refresh_token": X_REFRESH_TOKEN,
        "grant_type": "refresh_token",
        "client_id": X_CLIENT_ID
    }
    
    resp = requests.post(X_TOKEN_URL, headers=headers, data=data)
    if resp.status_code == 200:
        new_token_data = resp.json()
        new_refresh = new_token_data.get("refresh_token")
        if new_refresh:
            try:
                # 1. Save for GitHub Actions
                with open(".new_x_refresh_token", "w") as f:
                    f.write(new_refresh)
                
                # 2. Save for Local Persistence (update .env file)
                update_env_file("X_REFRESH_TOKEN", new_refresh)
            except Exception as e:
                print(f"Warning: Could not save new refresh token: {e}")
        return new_token_data.get("access_token")
    else:
        print(f"Error refreshing X token: {resp.text}", file=sys.stderr)
        return None

def fetch_latest_x_timeline(url, access_token, max_results=50):
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "max_results": max_results,
        "tweet.fields": "created_at,text,public_metrics,entities,referenced_tweets",
        "expansions": "author_id",
        "user.fields": "name,username"
    }
    resp = requests.get(url, headers=headers, params=params)
    if resp.status_code == 200:
        return resp.json().get("data", [])
    else:
        print(f"Error fetching X timeline: {resp.text}", file=sys.stderr)
        return []

def update_x_tweets_to_db(cur, new_tweets, is_bookmark=False, is_like=False, is_retweet=False):
    if not new_tweets:
        return 0, 0
    
    tuples = []
    for tweet in new_tweets:
        tweet_id = str(tweet.get("id"))
        
        # Extract author_id
        # For retweets, we prefer the original author's ID if possible (matching import-retweets.js logic)
        author_id = tweet.get("author_id", "")
        if is_retweet:
            entities = tweet.get("entities", {})
            mentions = entities.get("user_mentions", [])
            if mentions:
                author_id = str(mentions[0].get("id") or mentions[0].get("id_str") or author_id)
        
        if not author_id and "author" in tweet:
            author_id = tweet["author"].get("id", "")
            
        text = tweet.get("text", "")
        created_at = tweet.get("created_at") or tweet.get("timestamp")
        edit_history = tweet.get("edit_history_tweet_ids", [])
        
        metrics = tweet.get("public_metrics", {})
        retweet_count = metrics.get("retweet_count", 0)
        reply_count = metrics.get("reply_count", 0)
        like_count = metrics.get("like_count", 0)
        quote_count = metrics.get("quote_count", 0)
        bookmark_count = metrics.get("bookmark_count", 0)
        impression_count = metrics.get("impression_count", 0)
        
        article = tweet.get("article", {})
        article_title = article.get("title")
        
        entities = tweet.get("entities", {})
        
        tuples.append((
            tweet_id, is_bookmark, is_like, is_retweet, author_id, text, created_at,
            edit_history if isinstance(edit_history, list) else [edit_history],
            retweet_count, reply_count, like_count, quote_count, bookmark_count,
            impression_count, article_title, Json(entities)
        ))
        
    query = """
        INSERT INTO x_tweets (
            id, is_bookmark, is_like, is_retweet, author_id, text, created_at, edit_history_tweet_ids,
            retweet_count, reply_count, like_count, quote_count, bookmark_count, impression_count,
            article_title, entities
        ) VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            is_bookmark = x_tweets.is_bookmark OR EXCLUDED.is_bookmark,
            is_like = x_tweets.is_like OR EXCLUDED.is_like,
            is_retweet = x_tweets.is_retweet OR EXCLUDED.is_retweet,
            author_id = EXCLUDED.author_id,
            text = EXCLUDED.text,
            created_at = EXCLUDED.created_at,
            edit_history_tweet_ids = EXCLUDED.edit_history_tweet_ids,
            retweet_count = EXCLUDED.retweet_count,
            reply_count = EXCLUDED.reply_count,
            like_count = EXCLUDED.like_count,
            quote_count = EXCLUDED.quote_count,
            bookmark_count = EXCLUDED.bookmark_count,
            impression_count = EXCLUDED.impression_count,
            article_title = EXCLUDED.article_title,
            entities = EXCLUDED.entities
        RETURNING (xmax = 0);
    """
    results = execute_values(cur, query, tuples, fetch=True)
    
    synced = 0
    updated = 0
    for res in results:
        if res[0]:
            synced += 1
        else:
            updated += 1
            
    return synced, updated

if __name__ == "__main__":
    if not HAS_PSYCOPG2:
        print("Error: psycopg2 module not found. Please install it (e.g., pip install psycopg2-binary) to run this script.", file=sys.stderr)
        sys.exit(1)

    if not DB_HOST or not DB_PASSWORD:
        print("Error: Database credentials (SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD) not set in environment variables.", file=sys.stderr)
        sys.exit(1)

    conn = None
    youtube_synced_count = 0
    youtube_updated_count = 0
    youtube_deleted_count = 0
    github_synced_count = 0
    github_updated_count = 0
    github_deleted_count = 0
    x_bookmarks_synced = 0
    x_bookmarks_updated = 0
    x_likes_synced = 0
    x_likes_updated = 0
    x_retweets_synced = 0
    x_retweets_updated = 0

    try:
        print(f"Attempting to connect to database {DB_NAME} on {DB_HOST}:{DB_PORT}...")
        conn = psycopg2.connect(
            host=DB_HOST,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        cur = conn.cursor()
        print("Successfully connected to the database.")

        # --- YouTube Liked Videos ---
        all_liked_videos_from_api = []
        current_youtube_urls_from_api = set()
        youtube_service_active = False
        try:
            youtube_service = get_authenticated_service()
            if not youtube_service:
                 print("Failed to get authenticated YouTube service. Skipping YouTube sync.", file=sys.stderr)
            else:
                youtube_service_active = True
                print("YouTube authentication successful. Fetching liked videos...")
                all_liked_videos_from_api = get_liked_videos(youtube_service)
                print(f"Found {len(all_liked_videos_from_api)} liked videos from API.")
                current_youtube_urls_from_api = {video['url'] for video in all_liked_videos_from_api if video.get('url') != "No URL"}

                if all_liked_videos_from_api:
                    video_data_tuples = []
                    for video in all_liked_videos_from_api:
                        if video.get('url') == "No URL":
                            print(f"Skipping video due to missing URL: {video.get('title')}", file=sys.stderr)
                            continue
                        published_at_dt = video.get("published_at")
                        if published_at_dt == "No Date": published_at_dt = None
                        thumbnail_url_val = video.get("thumbnail_url")
                        if thumbnail_url_val == "No Thumbnail": thumbnail_url_val = None
                        video_data_tuples.append((
                            video.get("title", "No Title"),
                            video.get("url"),
                            video.get("video_owner_channel_id"),
                            video.get("video_owner_channel_title"),
                            published_at_dt,
                            thumbnail_url_val
                        ))
                    if video_data_tuples:
                        sql_youtube_upsert = """
                            INSERT INTO liked_videos (title, url, video_owner_channel_id, video_owner_channel_title, published_at, thumbnail_url)
                            VALUES %s
                            ON CONFLICT (url) DO UPDATE SET
                                title = EXCLUDED.title,
                                video_owner_channel_id = EXCLUDED.video_owner_channel_id,
                                video_owner_channel_title = EXCLUDED.video_owner_channel_title,
                                published_at = EXCLUDED.published_at,
                                thumbnail_url = EXCLUDED.thumbnail_url
                            RETURNING (xmax = 0);
                        """
                        results = execute_values(cur, sql_youtube_upsert, video_data_tuples, fetch=True)
                        temp_synced = 0
                        temp_updated = 0
                        for result in results:
                            if result[0]: temp_synced += 1
                            else: temp_updated += 1
                        youtube_synced_count = temp_synced
                        youtube_updated_count = temp_updated
                        conn.commit()
                        print(f"YouTube liked videos upsert complete. Added: {youtube_synced_count}, Updated: {youtube_updated_count}.")
                    else:
                        print("No valid YouTube video data to upsert after filtering.")

                if youtube_service_active:
                    cur.execute("SELECT url FROM liked_videos")
                    db_youtube_urls = {row[0] for row in cur.fetchall()}
                    youtube_urls_to_delete = db_youtube_urls - current_youtube_urls_from_api

                    if youtube_urls_to_delete:
                        print(f"Found {len(youtube_urls_to_delete)} YouTube videos to delete from database.")
                        deleted_this_batch = 0
                        for url_to_delete in list(youtube_urls_to_delete): # Iterate over a copy
                            cur.execute("DELETE FROM liked_videos WHERE url = %s", (url_to_delete,))
                            deleted_this_batch += cur.rowcount
                        if deleted_this_batch > 0:
                            youtube_deleted_count = deleted_this_batch
                            conn.commit()
                            print(f"Deletion of YouTube videos complete. Deleted: {youtube_deleted_count}.")
                        else:
                            print("No YouTube videos were actually deleted (rowcount was 0 for all attempts or no items to delete).")
                    else:
                        print("No YouTube videos to delete. Database is in sync with API or API returned no items.")
        except Exception as e_yt:
            print(f"An error occurred during YouTube liked videos processing: {e_yt}", file=sys.stderr)
            if conn: conn.rollback()

        # --- GitHub Stars ---
        all_starred_repos_from_api = []
        current_github_repo_ids_from_api = set()
        github_user = os.environ.get("GH_USER")
        github_token = os.environ.get("GH_TOKEN")

        if not github_user:
            print("\nError: GH_USER environment variable not set. Skipping GitHub sync.", file=sys.stderr)
        else:
            if not github_token: # Token is optional, but print warning
                print("\nWarning: GH_TOKEN environment variable not set. API calls may be rate-limited or fail for private data.", file=sys.stderr)
            try:
                print("\nFetching GitHub starred repositories...")
                all_starred_repos_from_api = get_github_stars(github_user, github_token)
                print(f"Found {len(all_starred_repos_from_api)} starred repositories from API.")
                current_github_repo_ids_from_api = {repo['id'] for repo in all_starred_repos_from_api if repo.get('id')}

                print("Fetching GitHub Star Lists (GraphQL)...")
                star_lists_by_repo = get_github_star_lists_by_repo_id(github_user, github_token)
                if star_lists_by_repo is not None:
                    n = len(star_lists_by_repo)
                    print(f"Star Lists: mapped {n} repositories to at least one list.")
                else:
                    print(
                        "Star Lists: GraphQL fetch failed or skipped; existing star_list_names preserved on update.",
                        file=sys.stderr,
                    )

                if all_starred_repos_from_api:
                    repo_data_tuples = []
                    for repo in all_starred_repos_from_api:
                        if not repo.get('id'):
                            print(f"Skipping repository due to missing ID: {repo.get('full_name')}", file=sys.stderr)
                            continue
                        rid = repo.get("id")
                        list_names = None
                        if star_lists_by_repo is not None:
                            list_names = star_lists_by_repo.get(rid, [])
                        repo_data_tuples.append((
                            rid, repo.get("full_name"), repo.get("html_url"),
                            repo.get("description"), repo.get("language"), repo.get("stargazers_count"),
                            repo.get("forks_count"), repo.get("pushed_at"), repo.get("owner", {}).get("login"),
                            repo.get("owner", {}).get("avatar_url"), repo.get("starred_at"),
                            list_names,
                        ))
                    if repo_data_tuples:
                        sql_github_upsert = """
                            INSERT INTO github_stars (repo_id, full_name, html_url, description, language,
                                                    stargazers_count, forks_count, pushed_at, owner_login,
                                                    owner_avatar_url, starred_at, star_list_names)
                            VALUES %s
                            ON CONFLICT (repo_id) DO UPDATE SET
                                full_name = EXCLUDED.full_name, html_url = EXCLUDED.html_url,
                                description = EXCLUDED.description, language = EXCLUDED.language,
                                stargazers_count = EXCLUDED.stargazers_count, forks_count = EXCLUDED.forks_count,
                                pushed_at = EXCLUDED.pushed_at, owner_login = EXCLUDED.owner_login,
                                owner_avatar_url = EXCLUDED.owner_avatar_url, starred_at = EXCLUDED.starred_at,
                                star_list_names = COALESCE(EXCLUDED.star_list_names, github_stars.star_list_names)
                            RETURNING (xmax = 0);
                        """
                        results = execute_values(cur, sql_github_upsert, repo_data_tuples, fetch=True)
                        temp_synced = 0
                        temp_updated = 0
                        for result in results:
                            if result[0]: temp_synced += 1
                            else: temp_updated += 1
                        github_synced_count = temp_synced
                        github_updated_count = temp_updated
                        conn.commit()
                        print(f"GitHub starred repositories upsert complete. Added: {github_synced_count}, Updated: {github_updated_count}.")
                    else:
                        print("No valid GitHub repository data to upsert after filtering.")

                # Deletion logic for GitHub (runs if GH_USER is set)
                cur.execute("SELECT repo_id FROM github_stars")
                db_github_repo_ids = {row[0] for row in cur.fetchall()}
                github_ids_to_delete = db_github_repo_ids - current_github_repo_ids_from_api

                if github_ids_to_delete:
                    print(f"Found {len(github_ids_to_delete)} GitHub repos to delete from database.")
                    deleted_this_batch = 0
                    for repo_id_to_delete in list(github_ids_to_delete): # Iterate over a copy
                        cur.execute("DELETE FROM github_stars WHERE repo_id = %s", (repo_id_to_delete,))
                        deleted_this_batch += cur.rowcount
                    if deleted_this_batch > 0:
                        github_deleted_count = deleted_this_batch
                        conn.commit()
                        print(f"Deletion of GitHub repos complete. Deleted: {github_deleted_count}.")
                    else:
                         print("No GitHub repos were actually deleted (rowcount was 0 for all attempts or no items to delete).")
                else:
                    print("No GitHub repos to delete. Database is in sync with API or API returned no items.")
            except psycopg2.Error as e_gh_db: # Catch psycopg2 errors specifically if they occur in GitHub block
                print(f"A database error occurred during GitHub stars processing: {e_gh_db}", file=sys.stderr)
                if conn: conn.rollback()
            except Exception as e_gh:
                print(f"An error occurred during GitHub stars processing: {e_gh}", file=sys.stderr)
                if conn: conn.rollback() # General rollback for other exceptions in GitHub block

        # --- X (Twitter) Bookmarks & Likes ---
        try:
            print("\nFetching X (Twitter) interactions...")
            if not X_REFRESH_TOKEN:
                print("Info: X_REFRESH_TOKEN not set in environment. Skipping X sync.", file=sys.stderr)
            else:
                access_token = refresh_x_token()
                
                if access_token:
                    # Get user ID
                    me_resp = requests.get("https://api.x.com/2/users/me", headers={"Authorization": f"Bearer {access_token}"})
                    if me_resp.status_code == 200:
                        x_user_id = me_resp.json()["data"]["id"]
                        
                        # Sync Bookmarks
                        print("Fetching X Bookmarks...")
                        bookmarks = fetch_latest_x_timeline(f"https://api.x.com/2/users/{x_user_id}/bookmarks", access_token, max_results=50)
                        x_bookmarks_synced, x_bookmarks_updated = update_x_tweets_to_db(cur, bookmarks, is_bookmark=True, is_like=False, is_retweet=False)
                        print(f"X Bookmarks upsert complete. Added: {x_bookmarks_synced}, Updated: {x_bookmarks_updated}.")
                        
                        # Sync Likes
                        print("Fetching X Likes...")
                        likes = fetch_latest_x_timeline(f"https://api.x.com/2/users/{x_user_id}/liked_tweets", access_token, max_results=50)
                        x_likes_synced, x_likes_updated = update_x_tweets_to_db(cur, likes, is_bookmark=False, is_like=True, is_retweet=False)
                        print(f"X Likes upsert complete. Added: {x_likes_synced}, Updated: {x_likes_updated}.")
                        
                        # Sync Retweets
                        print("Fetching X Retweets from timeline...")
                        timeline = fetch_latest_x_timeline(f"https://api.x.com/2/users/{x_user_id}/tweets", access_token, max_results=50)
                        retweets = [t for t in timeline if "referenced_tweets" in t and any(r["type"] == "retweeted" for r in t["referenced_tweets"])]
                        x_retweets_synced, x_retweets_updated = update_x_tweets_to_db(cur, retweets, is_bookmark=False, is_like=False, is_retweet=True)
                        print(f"X Retweets upsert complete. Added: {x_retweets_synced}, Updated: {x_retweets_updated}.")
                        
                        conn.commit()
                    else:
                        print(f"Error fetching X user info: {me_resp.text}", file=sys.stderr)
        except Exception as e_x:
            print(f"An error occurred during X (Twitter) processing: {e_x}", file=sys.stderr)
            if conn: conn.rollback()

    except psycopg2.Error as e_db:
        print(f"Database connection or operational error: {e_db}", file=sys.stderr)
        if conn: conn.rollback()
    except Exception as e_main:
        print(f"An unexpected error occurred in the main block: {e_main}", file=sys.stderr)
        if conn: conn.rollback()
    finally:
        if conn:
            conn.close()
            print("Database connection closed.")
        print("\n--- Sync Summary ---")
        print(f"YouTube Liked Videos: {youtube_synced_count} added, {youtube_updated_count} updated, {youtube_deleted_count} deleted.")
        print(f"GitHub Starred Repos: {github_synced_count} added, {github_updated_count} updated, {github_deleted_count} deleted.")
        print(f"X Bookmarks: {x_bookmarks_synced} added, {x_bookmarks_updated} updated.")
        print(f"X Likes: {x_likes_synced} added, {x_likes_updated} updated.")
        print(f"X Retweets: {x_retweets_synced} added, {x_retweets_updated} updated.")

        # Trigger Vercel build if any changes were made
        changes_made = any([
            youtube_synced_count > 0, youtube_updated_count > 0, youtube_deleted_count > 0,
            github_synced_count > 0, github_updated_count > 0, github_deleted_count > 0,
            x_bookmarks_synced > 0, x_bookmarks_updated > 0, x_likes_synced > 0, x_likes_updated > 0,
            x_retweets_synced > 0, x_retweets_updated > 0
        ])

        if changes_made:
            vercel_hook_url = os.getenv("VERCEL_DEPLOY_HOOK_URL")
            if vercel_hook_url:
                print("\nAttempting to trigger Vercel deployment...")
                trigger_vercel_deploy(vercel_hook_url)
            else:
                print("\nInfo: VERCEL_DEPLOY_HOOK_URL not set in environment. Skipping Vercel build trigger despite changes.", file=sys.stderr)
        else:
            print("\nNo changes detected in database. Skipping Vercel build trigger.")
