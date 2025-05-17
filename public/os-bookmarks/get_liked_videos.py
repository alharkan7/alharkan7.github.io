import os
import pickle
import json
import requests
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
    from psycopg2.extras import execute_values
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

    if dotenv_path_script_dir.exists():
        load_dotenv(dotenv_path=dotenv_path_script_dir)
        print(f"Loaded .env file from {dotenv_path_script_dir}")
    elif dotenv_path_cwd.exists():
        load_dotenv(dotenv_path=dotenv_path_cwd)
        print(f"Loaded .env file from {dotenv_path_cwd}")
    else:
        print("Info: .env file not found in script directory or current working directory. Relying on shell environment variables for all configurations.", file=sys.stderr)
else:
    print("Warning: python-dotenv module not found. Relying solely on shell/system-set environment variables.", file=sys.stderr)


DB_HOST = os.getenv("SUPABASE_DB_HOST")
DB_NAME = os.getenv("SUPABASE_DB_NAME", "postgres")
DB_USER = os.getenv("SUPABASE_DB_USER", "postgres")
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")
DB_PORT = os.getenv("SUPABASE_DB_PORT", "5432")

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
        github_user = os.environ.get("GITHUB_USER")
        github_token = os.environ.get("GITHUB_TOKEN")

        if not github_user:
            print("\nError: GITHUB_USER environment variable not set. Skipping GitHub sync.", file=sys.stderr)
        else:
            if not github_token: # Token is optional, but print warning
                print("\nWarning: GITHUB_TOKEN environment variable not set. API calls may be rate-limited or fail for private data.", file=sys.stderr)
            try:
                print("\nFetching GitHub starred repositories...")
                all_starred_repos_from_api = get_github_stars(github_user, github_token)
                print(f"Found {len(all_starred_repos_from_api)} starred repositories from API.")
                current_github_repo_ids_from_api = {repo['id'] for repo in all_starred_repos_from_api if repo.get('id')}

                if all_starred_repos_from_api:
                    repo_data_tuples = []
                    for repo in all_starred_repos_from_api:
                        if not repo.get('id'):
                            print(f"Skipping repository due to missing ID: {repo.get('full_name')}", file=sys.stderr)
                            continue
                        repo_data_tuples.append((
                            repo.get("id"), repo.get("full_name"), repo.get("html_url"),
                            repo.get("description"), repo.get("language"), repo.get("stargazers_count"),
                            repo.get("forks_count"), repo.get("pushed_at"), repo.get("owner", {}).get("login"),
                            repo.get("owner", {}).get("avatar_url"), repo.get("starred_at")
                        ))
                    if repo_data_tuples:
                        sql_github_upsert = """
                            INSERT INTO github_stars (repo_id, full_name, html_url, description, language,
                                                    stargazers_count, forks_count, pushed_at, owner_login,
                                                    owner_avatar_url, starred_at)
                            VALUES %s
                            ON CONFLICT (repo_id) DO UPDATE SET
                                full_name = EXCLUDED.full_name, html_url = EXCLUDED.html_url,
                                description = EXCLUDED.description, language = EXCLUDED.language,
                                stargazers_count = EXCLUDED.stargazers_count, forks_count = EXCLUDED.forks_count,
                                pushed_at = EXCLUDED.pushed_at, owner_login = EXCLUDED.owner_login,
                                owner_avatar_url = EXCLUDED.owner_avatar_url, starred_at = EXCLUDED.starred_at
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

                # Deletion logic for GitHub (runs if GITHUB_USER is set)
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
