import os
import json
import umap
from sklearn.cluster import KMeans
import numpy as np

checkpoint_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'public', 'data', 'embeddings_checkpoint.jsonl')
input_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'public', 'data', 'raw_videos.json')
output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'public', 'data', 'video-embeddings.json')

with open(input_path, 'r', encoding='utf-8') as f:
    videos = json.load(f)

checkpoint = {}
with open(checkpoint_path, 'r', encoding='utf-8') as f:
    for line in f:
        if not line.strip(): continue
        try:
            data = json.loads(line)
            checkpoint[str(data['id'])] = data['embedding']
        except Exception as e:
            pass

valid_videos = []
embeddings = []
for v in videos:
    vid_id = str(v['id'])
    if vid_id in checkpoint:
        valid_videos.append(v)
        embeddings.append(checkpoint[vid_id])

print(f"Loaded {len(embeddings)} embeddings from local checkpoint. No API calls needed!")

print("Reducing dimensionality to 3D with UMAP...")
reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, n_components=3, metric='cosine', random_state=42)
embeddings_3d = reducer.fit_transform(embeddings)

print("Clustering for coloring...")
kmeans = KMeans(n_clusters=min(12, max(2, len(valid_videos)//50)), random_state=42, n_init='auto')
clusters = kmeans.fit_predict(embeddings)

print("Formatting data...")
output_data = []
for i, video in enumerate(valid_videos):
    output_data.append({
        "id": str(video['id']),
        "title": video['title'] or "Unknown Title",
        "url": video['url'] or "",
        "thumbnail_url": video['thumbnail_url'] or "",
        "channel_title": video['channel_title'] or "Unknown Channel",
        "year": video.get('year') or None,
        "x": float(embeddings_3d[i][0]),
        "y": float(embeddings_3d[i][1]),
        "z": float(embeddings_3d[i][2]),
        "cluster": int(clusters[i])
    })

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f"Successfully processed {len(output_data)} videos in 3D and saved to {output_path}")
