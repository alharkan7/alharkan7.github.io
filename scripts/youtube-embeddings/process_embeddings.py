import os
import json
import time
from google import genai
import umap
from sklearn.cluster import KMeans
import numpy as np
from dotenv import load_dotenv
import concurrent.futures
import threading

load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("Please set the GEMINI_API_KEY environment variable.")
client = genai.Client()

input_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'data', 'raw_videos.json')
checkpoint_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'data', 'embeddings_checkpoint.jsonl')
output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'data', 'video-embeddings.json')

if not os.path.exists(input_path):
    raise FileNotFoundError(f"Input file {input_path} not found. Run download_videos.py first.")

with open(input_path, 'r', encoding='utf-8') as f:
    videos = json.load(f)

print(f"Loaded {len(videos)} videos from local cache.", flush=True)

# Load existing checkpoint
checkpoint = {}
if os.path.exists(checkpoint_path):
    with open(checkpoint_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            try:
                data = json.loads(line)
                checkpoint[str(data['id'])] = data['embedding']
            except Exception as e:
                pass
    print(f"Loaded {len(checkpoint)} embeddings from checkpoint.", flush=True)

# Determine missing videos
missing_videos = []
for v in videos:
    if str(v['id']) not in checkpoint:
        missing_videos.append(v)

print(f"Found {len(missing_videos)} videos missing embeddings.", flush=True)

checkpoint_lock = threading.Lock()

def save_to_checkpoint(vid_id, emb):
    with checkpoint_lock:
        with open(checkpoint_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({"id": str(vid_id), "embedding": emb}) + '\n')
        checkpoint[str(vid_id)] = emb

def get_embedding(video):
    vid_id = str(video['id'])
    text = video['title'] or "Unknown Title"
    try:
        result = client.models.embed_content(
            model='gemini-embedding-2',
            contents=text
        )
        emb = result.embeddings[0].values
        save_to_checkpoint(vid_id, emb)
        return True
    except Exception as e:
        print(f"Error for {vid_id}, retrying in 5 seconds... ({e})", flush=True)
        time.sleep(5)
        try:
            result = client.models.embed_content(
                model='gemini-embedding-2',
                contents=text
            )
            emb = result.embeddings[0].values
            save_to_checkpoint(vid_id, emb)
            return True
        except Exception as retry_e:
            print(f"Failed again for {vid_id}: {retry_e}", flush=True)
            return False

if missing_videos:
    print("Generating embeddings using Gemini API (parallel)...", flush=True)
    start_time = time.time()
    # Using 10 workers for faster processing on paid tier
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(get_embedding, v) for v in missing_videos]
        completed = 0
        for future in concurrent.futures.as_completed(futures):
            completed += 1
            if completed % 50 == 0:
                print(f"Processed {completed}/{len(missing_videos)} missing embeddings. Time elapsed: {time.time()-start_time:.1f}s", flush=True)

# Re-check checkpoint to prepare final dataset
embeddings = []
valid_videos = []
for v in videos:
    vid_id = str(v['id'])
    if vid_id in checkpoint:
        valid_videos.append(v)
        embeddings.append(checkpoint[vid_id])

print(f"Successfully collected embeddings for {len(embeddings)} videos.", flush=True)

if len(embeddings) == 0:
    print("No embeddings to process. Exiting.", flush=True)
    exit(1)

print("Reducing dimensionality with UMAP...", flush=True)
reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, n_components=2, metric='cosine', random_state=42)
embeddings_2d = reducer.fit_transform(embeddings)

print("Clustering for coloring...", flush=True)
kmeans = KMeans(n_clusters=min(12, max(2, len(valid_videos)//50)), random_state=42, n_init='auto')
clusters = kmeans.fit_predict(embeddings)

print("Formatting data...", flush=True)
output_data = []
for i, video in enumerate(valid_videos):
    output_data.append({
        "id": str(video['id']),
        "title": video['title'] or "Unknown Title",
        "url": video['url'] or "",
        "thumbnail_url": video['thumbnail_url'] or "",
        "channel_title": video['channel_title'] or "Unknown Channel",
        "x": float(embeddings_2d[i][0]),
        "y": float(embeddings_2d[i][1]),
        "cluster": int(clusters[i])
    })

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f"Successfully processed {len(output_data)} videos and saved to {output_path}", flush=True)
