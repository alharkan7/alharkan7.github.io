import os
import base64
import hashlib
import re
import requests
from urllib.parse import urlencode, urlparse, parse_qs

# Your keys from .env
X_CLIENT_ID = os.getenv("X_CLIENT_ID", "VXJfVHhfWjhkNVRPZl80S2VPdEE6MTpjaQ")
X_CLIENT_SECRET = os.getenv("X_CLIENT_SECRET", "VfvdqZQnU1tHMDuwlRElNZROnbZpNLHwnNrU0rFNTqp8q9E5Ha")

# Twitter requires a valid redirect URI that matches what is in your Developer Portal!
# If you used a Streamlit app before, it might have been http://localhost:8501 or similar.
REDIRECT_URI = "http://127.0.0.1:8501"

def generate_code_verifier():
    return base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8').rstrip('=')

def generate_code_challenge(verifier):
    digest = hashlib.sha256(verifier.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')

def main():
    print("If your Twitter Developer Portal does NOT have", REDIRECT_URI, "as a Callback App URL, please edit this script and change REDIRECT_URI to match what you have in your portal!")
    
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)
    
    params = {
        "response_type": "code",
        "client_id": X_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": "offline.access bookmark.read like.read users.read tweet.read",
        "state": "state",
        "code_challenge": code_challenge,
        "code_challenge_method": "S256"
    }
    
    auth_url = "https://twitter.com/i/oauth2/authorize?" + urlencode(params)
    
    print("\n1. Please click this link to authorize the app:")
    print(auth_url)
    
    print("\n2. After you authorize, you will be redirected to a URL that might say 'Site cannot be reached'. That is normal!")
    redirected_url = input("Paste the entire URL you were redirected to here: ").strip()
    
    parsed = parse_qs(urlparse(redirected_url).query)
    if "code" not in parsed:
        print("Error: Could not find 'code' in the URL you pasted.")
        return
        
    code = parsed["code"][0]
    
    # Exchange code for tokens
    auth = base64.b64encode(f"{X_CLIENT_ID}:{X_CLIENT_SECRET}".encode("utf-8")).decode("utf-8")
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": f"Basic {auth}"
    }
    data = {
        "code": code,
        "grant_type": "authorization_code",
        "client_id": X_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "code_verifier": code_verifier
    }
    
    resp = requests.post("https://api.x.com/2/oauth2/token", headers=headers, data=data)
    if resp.status_code == 200:
        tokens = resp.json()
        print("\nSUCCESS! Here is your brand new refresh token:\n")
        print(tokens["refresh_token"])
        print("\nPlease copy that string and put it in your .env file as X_REFRESH_TOKEN=...")
    else:
        print(f"\nFailed to get tokens: {resp.status_code}")
        print(resp.text)

if __name__ == "__main__":
    main()
