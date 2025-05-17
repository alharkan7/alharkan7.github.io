import os
import pickle
import json
import requests # <-- Add requests import
from dotenv import load_dotenv # <-- Import load_dotenv
from pathlib import Path # Added for .env path handling
import psycopg2 # Added for PostgreSQL interaction
from psycopg2.extras import execute_values # <--- IMPORT execute_values
import sys # For sys.stderr and sys.exit

# Remove google_auth_oauthlib import if not falling back to local flow
# from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials # Import Credentials

# This scope allows the script to read your YouTube account data.
SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"]
API_SERVICE_NAME = "youtube"
API_VERSION = "v3"
# Construct the path to client_secrets.json relative to this script's directory
SCRIPT_DIR = Path(__file__).resolve().parent # Use Path object
# CLIENT_SECRETS_FILE and TOKEN_PICKLE_FILE are no longer used by the primary auth flow in Actions
# CLIENT_SECRETS_FILE = os.path.join(SCRIPT_DIR, "client_secrets.json")
# TOKEN_PICKLE_FILE = os.path.join(SCRIPT_DIR, "token.pickle") # Also store token relative to script

# --- Load .env file ---
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

# --- Database Environment Variables ---
DB_HOST = os.getenv("SUPABASE_DB_HOST")
DB_NAME = os.getenv("SUPABASE_DB_NAME", "postgres")
DB_USER = os.getenv("SUPABASE_DB_USER", "postgres")
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")
DB_PORT = os.getenv("SUPABASE_DB_PORT", "5432")

def get_authenticated_service():
    """Authenticates using environment variables/secrets and returns the YouTube API service object."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN")

    # Check if running in GitHub Actions or similar environment with secrets
    if all([client_id, client_secret, refresh_token]):
        print("Attempting authentication using environment variables (GitHub Secrets)...")
        credentials = Credentials(
            None, # No access token initially
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret,
            scopes=SCOPES
        )
        # Refresh the credentials
        try:
            credentials.refresh(Request())
        except Exception as e:
            print(f"Error refreshing token using environment variables: {e}")
            # Indicate failure if refresh doesn't work
            raise Exception("Failed to refresh token using environment variables.") from e

        if not credentials or not credentials.valid:
             raise Exception("Could not obtain valid credentials after refresh using environment variables.")

        print("Authentication successful using environment variables.")
        return build(API_SERVICE_NAME, API_VERSION, credentials=credentials)

    # Fallback to local file-based authentication if environment variables are not set
    # This allows the script to still be run locally using the old method
    else:
        print("Environment variables not found. Attempting local file-based authentication...")
        # Define file paths here if needed for local execution
        CLIENT_SECRETS_FILE = str(SCRIPT_DIR / "client_secrets.json") # Ensure string for os.path
        TOKEN_PICKLE_FILE = str(SCRIPT_DIR / "token.pickle") # Ensure string for os.path

        # --- Start of original local authentication logic ---
        from google_auth_oauthlib.flow import InstalledAppFlow # Import only if needed for fallback

        credentials = None
        # The file token.pickle stores the user's access and refresh tokens...
        if os.path.exists(TOKEN_PICKLE_FILE):
            with open(TOKEN_PICKLE_FILE, "rb") as token:
                credentials = pickle.load(token)
        # If there are no (valid) credentials available, let the user log in.
        if not credentials or not credentials.valid:
            if credentials and credentials.expired and credentials.refresh_token:
                try:
                    credentials.refresh(Request())
                except Exception as e:
                     print(f"Error refreshing local token: {e}. Deleting token file.")
                     if os.path.exists(TOKEN_PICKLE_FILE):
                         os.remove(TOKEN_PICKLE_FILE)
                     credentials = None # Force re-authentication

            # Only proceed to interactive flow if credentials are still missing/invalid
            if not credentials or not credentials.valid:
                if not os.path.exists(CLIENT_SECRETS_FILE):
                     raise FileNotFoundError(f"Local authentication failed: {CLIENT_SECRETS_FILE} not found.")

                flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
                # Run the flow using a local server strategy
                try:
                    credentials = flow.run_local_server(port=0)
                except Exception as e:
                    raise Exception(f"Local OAuth flow failed: {e}") from e
            # Save the credentials for the next run
            with open(TOKEN_PICKLE_FILE, "wb") as token:
                pickle.dump(credentials, token)
        # --- End of original local authentication logic ---

        print("Authentication successful using local files.")
        return build(API_SERVICE_NAME, API_VERSION, credentials=credentials)

def get_liked_videos(youtube):
    """Fetches all liked videos for the authenticated user."""
    liked_videos = []
    next_page_token = None

    while True:
        request = youtube.playlistItems().list(
            part="snippet,contentDetails",
            playlistId="LL",  # "LL" is the special ID for the Liked Videos playlist
            maxResults=50,    # Max allowed value is 50
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
            # Get video owner details instead of playlist item channel details
            video_owner_channel_id = snippet.get("videoOwnerChannelId", "No Owner Channel ID") 
            video_owner_channel_title = snippet.get("videoOwnerChannelTitle", "No Owner Channel Title")
            published_at = snippet.get("publishedAt", "No Date") # Playlist item publish date
            # video_published_at = content_details.get("videoPublishedAt", "No Date") # Specific video publish date

            # Get the 'high' resolution thumbnail URL, fall back to 'medium' or 'default' if 'high' is not available
            thumbnail_url = thumbnails.get("high", {}).get("url")
            if not thumbnail_url:
                 thumbnail_url = thumbnails.get("medium", {}).get("url")
            if not thumbnail_url:
                 thumbnail_url = thumbnails.get("default", {}).get("url", "No Thumbnail")

            if video_id: # Only add if we have a valid video ID
                liked_videos.append({
                    "title": video_title,
                    "url": video_url,
                    # Use video owner details
                    "video_owner_channel_id": video_owner_channel_id,
                    "video_owner_channel_title": video_owner_channel_title,
                    "published_at": published_at,
                    "thumbnail_url": thumbnail_url
                })
            # print(f"Liked: {video_title} ({video_url}) Owner: {video_owner_channel_title} Published: {published_at} Thumbnail: {thumbnail_url}") # Uncomment to print during fetch

        next_page_token = response.get("nextPageToken")

        if not next_page_token:
            break # Exit the loop if there are no more pages

    return liked_videos

def get_github_stars(username, token):
    """Fetches all starred repositories for a given GitHub user using pagination, extracting only needed fields."""
    all_repos = []
    # Start with the first page, requesting 100 items per page (max)
    url = f"https://api.github.com/users/{username}/starred?per_page=100&sort=created&direction=desc"
    headers = {
        "Accept": "application/vnd.github.star+json", # Ensure this header is present for starred_at
        "Authorization": f"token {token}" if token else None # Handle case where token might be None
    }
    # Remove None Authorization header if token is not provided
    if headers["Authorization"] is None:
        del headers["Authorization"]

    while url:
        try:
            print(f"Fetching GitHub stars page: {url}")
            response = requests.get(url, headers=headers)
            response.raise_for_status()  # Raise HTTPError for bad responses (4XX or 5XX)
            
            page_data = response.json()
            if not isinstance(page_data, list):
                print(f"Warning: Expected a list but got {type(page_data)}. Stopping pagination.")
                print(f"Response content: {response.text[:500]}...")
                break
                
            # Extract only necessary fields
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
                # Add basic validation if needed, e.g., check if id and html_url exist
                if repo_minimal["id"] and repo_minimal["html_url"]:
                     all_repos.append(repo_minimal)
                else:
                    print(f"Warning: Skipping repo due to missing id or html_url. Raw data snippet: {str(repo_raw)[:200]}...")

            # Check for the 'next' link in the Link header
            if 'Link' in response.headers:
                links = requests.utils.parse_header_links(response.headers['Link'])
                next_link = None
                for link in links:
                    if link.get('rel') == 'next':
                        next_link = link.get('url')
                        break
                url = next_link
            else:
                url = None
        
        except requests.exceptions.RequestException as e:
            print(f"Error during GitHub API request: {e}")
            raise
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON response from GitHub: {e}")
            print(f"Response content: {response.text[:500]}...")
            raise
            
    return all_repos

if __name__ == "__main__":
    # Load environment variables from .env file if it exists
    # This is primarily for local development/testing
    # print("Checking for .env file for local execution...") # Already handled by global .env loading
    # dotenv_path = os.path.join(SCRIPT_DIR, '.env')
    # if os.path.exists(dotenv_path):
    #     load_dotenv(dotenv_path=dotenv_path)
    #     print(".env file loaded.")
    # else:
    #     print(".env file not found, relying on system environment variables.")

    # --- Database Connection Check ---
    if not DB_HOST or not DB_PASSWORD:
        print("Error: Database credentials (SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD) not set in environment variables.", file=sys.stderr)
        sys.exit(1)

    conn = None
    youtube_synced_count = 0
    youtube_updated_count = 0
    github_synced_count = 0
    github_updated_count = 0

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
        try:
            youtube_service = get_authenticated_service()
            if not youtube_service:
                 print("Failed to get authenticated YouTube service. Skipping YouTube sync.", file=sys.stderr)
            else:
                print("YouTube authentication successful. Fetching liked videos...")
                all_liked_videos = get_liked_videos(youtube_service)
                print(f"Found {len(all_liked_videos)} liked videos. Syncing to database...")

                if all_liked_videos: # Proceed only if there are videos
                    video_data_tuples = []
                    for video in all_liked_videos:
                        published_at_dt = video.get("published_at")
                        if published_at_dt == "No Date":
                            published_at_dt = None
                        thumbnail_url_val = video.get("thumbnail_url")
                        if thumbnail_url_val == "No Thumbnail":
                            thumbnail_url_val = None
                        video_data_tuples.append((
                            video.get("title", "No Title"),
                            video.get("url", "No URL"),
                            video.get("video_owner_channel_id"),
                            video.get("video_owner_channel_title"),
                            published_at_dt,
                            thumbnail_url_val
                        ))

                    sql_youtube = """
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
                    # Use execute_values for batch insert/update
                    results = execute_values(cur, sql_youtube, video_data_tuples, fetch=True)
                    
                    youtube_synced_count = 0
                    youtube_updated_count = 0
                    for result in results:
                        if result[0]: # (xmax = 0) is true if a new row was inserted
                            youtube_synced_count += 1
                        else:
                            youtube_updated_count += 1
                    
                    conn.commit()
                print(f"YouTube liked videos sync complete. Added: {youtube_synced_count}, Updated: {youtube_updated_count}.")
        
        except Exception as e_yt:
            print(f"An error occurred during YouTube liked videos processing: {e_yt}", file=sys.stderr)
            if conn: conn.rollback() # Rollback YouTube changes on error

        # --- GitHub Stars ---
        print("\nFetching GitHub starred repositories...")
        github_user = os.environ.get("GITHUB_USER")
        github_token = os.environ.get("GITHUB_TOKEN")

        if not github_user:
            print("Error: GITHUB_USER environment variable not set. Skipping GitHub sync.", file=sys.stderr)
        else:
            if not github_token:
                print("Warning: GITHUB_TOKEN environment variable not set. Proceeding without authentication for GitHub, may encounter rate limits.", file=sys.stderr)
            
            try:
                all_starred_repos = get_github_stars(github_user, github_token)
                print(f"Found {len(all_starred_repos)} starred repositories. Syncing to database...")

                if all_starred_repos: # Proceed only if there are repos
                    repo_data_tuples = []
                    for repo in all_starred_repos:
                        repo_data_tuples.append((
                            repo.get("id"),
                            repo.get("full_name"),
                            repo.get("html_url"),
                            repo.get("description"),
                            repo.get("language"),
                            repo.get("stargazers_count"),
                            repo.get("forks_count"),
                            repo.get("pushed_at"),
                            repo.get("owner", {}).get("login"),
                            repo.get("owner", {}).get("avatar_url"),
                            repo.get("starred_at")
                        ))

                    sql_github = """
                        INSERT INTO github_stars (repo_id, full_name, html_url, description, language, 
                                                stargazers_count, forks_count, pushed_at, owner_login, 
                                                owner_avatar_url, starred_at)
                        VALUES %s
                        ON CONFLICT (repo_id) DO UPDATE SET
                            full_name = EXCLUDED.full_name,
                            html_url = EXCLUDED.html_url,
                            description = EXCLUDED.description,
                            language = EXCLUDED.language,
                            stargazers_count = EXCLUDED.stargazers_count,
                            forks_count = EXCLUDED.forks_count,
                            pushed_at = EXCLUDED.pushed_at,
                            owner_login = EXCLUDED.owner_login,
                            owner_avatar_url = EXCLUDED.owner_avatar_url,
                            starred_at = EXCLUDED.starred_at
                        RETURNING (xmax = 0);
                    """
                    # Use execute_values for batch insert/update
                    results = execute_values(cur, sql_github, repo_data_tuples, fetch=True)

                    github_synced_count = 0
                    github_updated_count = 0
                    for result in results:
                        if result[0]: # (xmax = 0) is true if a new row was inserted
                            github_synced_count += 1
                        else:
                            github_updated_count += 1
                            
                    conn.commit()
                print(f"GitHub starred repositories sync complete. Added: {github_synced_count}, Updated: {github_updated_count}.")

            except Exception as e_gh:
                print(f"An error occurred during GitHub stars processing: {e_gh}", file=sys.stderr)
                if conn: conn.rollback() # Rollback GitHub changes on error
    
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
        print(f"YouTube Liked Videos: {youtube_synced_count} added, {youtube_updated_count} updated.")
        print(f"GitHub Starred Repos: {github_synced_count} added, {github_updated_count} updated.")

    # No longer need to check for client_secrets.json here,
    # as the auth function handles both methods and raises errors if needed.
    # if not os.path.exists(CLIENT_SECRETS_FILE):
    #     print(f"Error: {CLIENT_SECRETS_FILE} not found.")
    #     print("Please download your OAuth 2.0 client secrets file from the Google Cloud Console")
    #     print("and place it in the same directory as this script.")
    #     exit()

    # try:
    #     youtube_service = get_authenticated_service()
    #     if not youtube_service:
    #          # Handle case where authentication failed in get_authenticated_service
    #          print("Failed to get authenticated YouTube service. Exiting.")
    #          exit()

    #     print("Authentication check passed. Fetching liked videos...")
    #     all_liked_videos = get_liked_videos(youtube_service)

    #     print(f"\nFound {len(all_liked_videos)} liked videos:")
        # for video in all_liked_videos:
            # Print details
            # print(f"- Title: {video['title']}")
            # print(f"  URL: {video['url']}")
            # Print video owner channel details
            # print(f"  Video Owner: {video.get('video_owner_channel_title', 'N/A')} (ID: {video.get('video_owner_channel_id', 'N/A')})") 
            # print(f"  Published: {video.get('published_at', 'N/A')}")
            # print(f"  Thumbnail: {video.get('thumbnail_url', 'N/A')}")
            #print("---")

        # Define the output file path relative to the script directory
        # output_json_path = os.path.join(SCRIPT_DIR, "liked_videos.json") # SCRIPT_DIR is Path object

        # Save to a file (e.g., JSON) including thumbnail URL
        # with open(str(output_json_path), "w", encoding="utf-8") as f: # Use the full path, convert Path to str
        #     json.dump(all_liked_videos, f, ensure_ascii=False, indent=4)
        # print(f"\nLiked videos saved to {output_json_path}") # Use the full path

    # except Exception as e:
    #     print(f"An error occurred while fetching YouTube videos: {e}")
        # Exit or handle YouTube error appropriately, maybe continue to GitHub fetch?
        # For now, we'll let the script exit if YouTube fails.
        # exit(1) # Exit if YouTube fetch fails

    # --- Fetch GitHub Stars --- 
    # print("\nFetching GitHub starred repositories...")
    # github_user = os.environ.get("GITHUB_USER")
    # github_token = os.environ.get("GITHUB_TOKEN") # <-- Get the token
    # if not github_user:
    #     print("Error: GITHUB_USER environment variable not set.")
    #     exit(1)
    # if not github_token:
        # Allow running without a token for public data, but might hit rate limits faster
    #     print("Warning: GITHUB_TOKEN environment variable not set. Proceeding without authentication, may encounter rate limits.")
        
    # try:
        # Pass token to the function
    #     all_starred_repos = get_github_stars(github_user, github_token)
    #     print(f"Found {len(all_starred_repos)} starred repositories.")
        
        # Define the output file path for stars
        # stars_output_json_path = SCRIPT_DIR / "github_stars.json" # Use Path object
        
        # Save starred repos to JSON
        # with open(str(stars_output_json_path), "w", encoding="utf-8") as f: # convert Path to str
        #     json.dump(all_starred_repos, f, ensure_ascii=False, indent=4)
        # print(f"Starred repositories saved to {stars_output_json_path}")
        
    # except Exception as e:
    #     print(f"An error occurred while fetching GitHub stars: {e}")
    #     exit(1) # Exit if GitHub fetch fails 