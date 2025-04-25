import os
import pickle
import json
import requests # <-- Add requests import

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
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# CLIENT_SECRETS_FILE and TOKEN_PICKLE_FILE are no longer used by the primary auth flow in Actions
# CLIENT_SECRETS_FILE = os.path.join(SCRIPT_DIR, "client_secrets.json")
# TOKEN_PICKLE_FILE = os.path.join(SCRIPT_DIR, "token.pickle") # Also store token relative to script

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
        CLIENT_SECRETS_FILE = os.path.join(SCRIPT_DIR, "client_secrets.json")
        TOKEN_PICKLE_FILE = os.path.join(SCRIPT_DIR, "token.pickle")

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
    """Fetches all starred repositories for a given GitHub user using pagination."""
    all_repos = []
    # Start with the first page, requesting 100 items per page (max)
    url = f"https://api.github.com/users/{username}/starred?per_page=100&sort=created&direction=desc"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {token}"
    }

    while url:
        try:
            print(f"Fetching GitHub stars page: {url}")
            response = requests.get(url, headers=headers)
            response.raise_for_status()  # Raise HTTPError for bad responses (4XX or 5XX)
            
            page_data = response.json()
            if not isinstance(page_data, list):
                print(f"Warning: Expected a list but got {type(page_data)}. Stopping pagination.")
                print(f"Response content: {response.text[:500]}...") # Log part of unexpected response
                break # Stop if the response is not a list as expected
                
            all_repos.extend(page_data)

            # Check for the 'next' link in the Link header
            if 'Link' in response.headers:
                links = requests.utils.parse_header_links(response.headers['Link'])
                next_link = None
                for link in links:
                    if link.get('rel') == 'next':
                        next_link = link.get('url')
                        break
                url = next_link # Set url to None if 'next' link is not found, ending the loop
            else:
                url = None # No Link header, assume end of pages
        
        except requests.exceptions.RequestException as e:
            print(f"Error during GitHub API request: {e}")
            # Depending on the error, you might want to retry or just stop
            raise # Re-raise the exception to be caught by the main block
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON response from GitHub: {e}")
            print(f"Response content: {response.text[:500]}...")
            raise # Re-raise
            
    return all_repos

if __name__ == "__main__":
    # No longer need to check for client_secrets.json here,
    # as the auth function handles both methods and raises errors if needed.
    # if not os.path.exists(CLIENT_SECRETS_FILE):
    #     print(f"Error: {CLIENT_SECRETS_FILE} not found.")
    #     print("Please download your OAuth 2.0 client secrets file from the Google Cloud Console")
    #     print("and place it in the same directory as this script.")
    #     exit()

    try:
        youtube_service = get_authenticated_service()
        if not youtube_service:
             # Handle case where authentication failed in get_authenticated_service
             print("Failed to get authenticated YouTube service. Exiting.")
             exit()

        print("Authentication check passed. Fetching liked videos...")
        all_liked_videos = get_liked_videos(youtube_service)

        print(f"\nFound {len(all_liked_videos)} liked videos:")
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
        output_json_path = os.path.join(SCRIPT_DIR, "liked_videos.json")

        # Save to a file (e.g., JSON) including thumbnail URL
        with open(output_json_path, "w", encoding="utf-8") as f: # Use the full path
            json.dump(all_liked_videos, f, ensure_ascii=False, indent=4)
        print(f"\nLiked videos saved to {output_json_path}") # Use the full path

    except Exception as e:
        print(f"An error occurred while fetching YouTube videos: {e}")
        # Exit or handle YouTube error appropriately, maybe continue to GitHub fetch?
        # For now, we'll let the script exit if YouTube fails.
        exit(1) # Exit if YouTube fetch fails

    # --- Fetch GitHub Stars --- 
    print("\nFetching GitHub starred repositories...")
    github_user = os.environ.get("GITHUB_USER")
    github_token = os.environ.get("GITHUB_TOKEN") # <-- Get the token
    if not github_user:
        print("Error: GITHUB_USER environment variable not set.")
        exit(1)
    if not github_token:
        # Allow running without a token for public data, but might hit rate limits faster
        print("Warning: GITHUB_TOKEN environment variable not set. Proceeding without authentication, may encounter rate limits.")
        
    try:
        # Pass token to the function
        all_starred_repos = get_github_stars(github_user, github_token)
        print(f"Found {len(all_starred_repos)} starred repositories.")
        
        # Define the output file path for stars
        stars_output_json_path = os.path.join(SCRIPT_DIR, "github_stars.json")
        
        # Save starred repos to JSON
        with open(stars_output_json_path, "w", encoding="utf-8") as f:
            json.dump(all_starred_repos, f, ensure_ascii=False, indent=4)
        print(f"Starred repositories saved to {stars_output_json_path}")
        
    except Exception as e:
        print(f"An error occurred while fetching GitHub stars: {e}")
        exit(1) # Exit if GitHub fetch fails 