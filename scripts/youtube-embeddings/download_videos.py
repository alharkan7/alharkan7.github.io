import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DB_URL = f"postgresql://{os.environ.get('SUPABASE_DB_USER')}:{os.environ.get('SUPABASE_DB_PASSWORD')}@{os.environ.get('SUPABASE_DB_HOST')}:{os.environ.get('SUPABASE_DB_PORT')}/{os.environ.get('SUPABASE_DB_NAME')}"

print("Connecting to database...")
conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

print("Fetching all videos...")
cursor.execute("SELECT id, title, url, thumbnail_url, video_owner_channel_title as channel_title, CAST(extract(year from published_at) AS INTEGER) as year FROM liked_videos;")
videos = cursor.fetchall()
print(f"Fetched {len(videos)} videos.")

output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'public', 'data', 'raw_videos.json')
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump([dict(v) for v in videos], f, ensure_ascii=False, indent=2)

print(f"Saved raw videos to {output_path}")
