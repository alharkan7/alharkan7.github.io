import os
import json
import requests
import base64
from dotenv import load_dotenv

# Load credentials
load_dotenv()
if not os.getenv("X_CLIENT_ID"):
    load_dotenv("../.env")

CLIENT_ID = os.getenv("X_CLIENT_ID")
CLIENT_SECRET = os.getenv("X_CLIENT_SECRET")
TOKEN_URL = "https://api.x.com/2/oauth2/token"

# Setup paths relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKENS_FILE = os.path.join(SCRIPT_DIR, "tokens.json")
BOOKMARKS_FILE = os.path.join(SCRIPT_DIR, "bookmarks.json")
LIKES_FILE = os.path.join(SCRIPT_DIR, "likes.json")

def refresh_token(old_token_data):
    print("Refreshing access token...")
    auth = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode("utf-8")).decode("utf-8")
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": f"Basic {auth}"
    }
    data = {
        "refresh_token": old_token_data["refresh_token"],
        "grant_type": "refresh_token",
        "client_id": CLIENT_ID
    }
    
    resp = requests.post(TOKEN_URL, headers=headers, data=data)
    if resp.status_code == 200:
        new_token_data = resp.json()
        with open(TOKENS_FILE, "w") as f:
            json.dump(new_token_data, f)
        return new_token_data["access_token"]
    else:
        print(f"Error refreshing token: {resp.text}")
        return None

def fetch_latest_100(url, access_token):
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "max_results": 100,
        "tweet.fields": "created_at,text,public_metrics,entities",
        "expansions": "author_id",
        "user.fields": "name,username"
    }
    resp = requests.get(url, headers=headers, params=params)
    if resp.status_code == 200:
        return resp.json().get("data", [])
    else:
        print(f"Error fetching data: {resp.text}")
        return []

def merge_data(filename, new_items):
    if not new_items:
        return
    
    existing_items = []
    if os.path.exists(filename):
        with open(filename, "r") as f:
            try:
                raw_data = json.load(f)
                # Handle both flat lists and X-style response dictionaries
                if isinstance(raw_data, list):
                    existing_items = raw_data
                elif isinstance(raw_data, dict) and "data" in raw_data:
                    existing_items = raw_data["data"]
                else:
                    existing_items = []
            except:
                existing_items = []
    
    # Use ID to prevent duplicates (with validation)
    existing_ids = set()
    for item in existing_items:
        if isinstance(item, dict) and "id" in item:
            existing_ids.add(item["id"])
            
    added_count = 0
    for item in new_items:
        if isinstance(item, dict) and item.get("id") not in existing_ids:
            existing_items.insert(0, item) # Add to the top
            added_count += 1
            if "id" in item: 
                existing_ids.add(item["id"])
            
    with open(filename, "w") as f:
        json.dump(existing_items, f, indent=4)
    
    print(f"Added {added_count} new items to {filename}")

def main():
    if not os.path.exists(TOKENS_FILE):
        print(f"Error: {TOKENS_FILE} not found. Please run the Streamlit app and login once.")
        return

    with open(TOKENS_FILE, "r") as f:
        token_data = json.load(f)
    
    access_token = refresh_token(token_data)
    if not access_token:
        return

    # Get User ID
    me_resp = requests.get("https://api.x.com/2/users/me", headers={"Authorization": f"Bearer {access_token}"})
    if me_resp.status_code != 200:
        print(f"Error getting user info: {me_resp.text}")
        return
    
    user_id = me_resp.json()["data"]["id"]
    
    # Sync Bookmarks
    print("Syncing Bookmarks...")
    bookmarks = fetch_latest_100(f"https://api.x.com/2/users/{user_id}/bookmarks", access_token)
    print(f"Received {len(bookmarks)} total bookmarks from X.")
    if bookmarks: merge_data(BOOKMARKS_FILE, bookmarks)
    
    # Sync Likes
    print("Syncing Likes...")
    likes = fetch_latest_100(f"https://api.x.com/2/users/{user_id}/liked_tweets", access_token)
    print(f"Received {len(likes)} total likes from X.")
    if likes: merge_data(LIKES_FILE, likes)

if __name__ == "__main__":
    main()
