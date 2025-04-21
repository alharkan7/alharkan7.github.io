import os
import pickle
import json

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

# This scope allows the script to read your YouTube account data.
SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"]
API_SERVICE_NAME = "youtube"
API_VERSION = "v3"
# Construct the path to client_secrets.json relative to this script's directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_SECRETS_FILE = os.path.join(SCRIPT_DIR, "client_secrets.json")
TOKEN_PICKLE_FILE = os.path.join(SCRIPT_DIR, "token.pickle") # Also store token relative to script

def get_authenticated_service():
    """Authenticates the user and returns the YouTube API service object."""
    credentials = None
    # The file token.pickle stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first time.
    if os.path.exists(TOKEN_PICKLE_FILE): # Use the full path
        with open(TOKEN_PICKLE_FILE, "rb") as token: # Use the full path
            credentials = pickle.load(token)
    # If there are no (valid) credentials available, let the user log in.
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES) # Uses full path
            # Run the flow using a local server strategy
            credentials = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open(TOKEN_PICKLE_FILE, "wb") as token: # Use the full path
            pickle.dump(credentials, token)

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
                    "thumbnail_url": thumbnail_url 
                })
            # print(f"Liked: {video_title} ({video_url}) Thumbnail: {thumbnail_url}") # Uncomment to print during fetch

        next_page_token = response.get("nextPageToken")

        if not next_page_token:
            break # Exit the loop if there are no more pages

    return liked_videos

if __name__ == "__main__":
    # Check if client_secrets.json exists
    if not os.path.exists(CLIENT_SECRETS_FILE):
        print(f"Error: {CLIENT_SECRETS_FILE} not found.")
        print("Please download your OAuth 2.0 client secrets file from the Google Cloud Console")
        print("and place it in the same directory as this script.")
        exit()

    try:
        youtube_service = get_authenticated_service()
        print("Authentication successful. Fetching liked videos...")
        all_liked_videos = get_liked_videos(youtube_service)

        print(f"Found {len(all_liked_videos)} liked videos:")
        for video in all_liked_videos:
            # Print title, URL, and thumbnail URL
            print(f"- {video['title']} ({video['url']})")
            print(f"  Thumbnail: {video.get('thumbnail_url', 'N/A')}")

        # Define the output file path relative to the script directory
        output_json_path = os.path.join(SCRIPT_DIR, "liked_videos.json")

        # Save to a file (e.g., JSON) including thumbnail URL
        with open(output_json_path, "w", encoding="utf-8") as f: # Use the full path
            json.dump(all_liked_videos, f, ensure_ascii=False, indent=4)
        print(f"\\nLiked videos saved to {output_json_path}") # Use the full path

    except Exception as e:
        print(f"An error occurred: {e}")
        # Attempt to remove token.pickle if authentication fails persistently
        if os.path.exists(TOKEN_PICKLE_FILE): # Use the full path
            os.remove(TOKEN_PICKLE_FILE) # Use the full path
            print("Removed potentially corrupt token.pickle. Please try running the script again.") 