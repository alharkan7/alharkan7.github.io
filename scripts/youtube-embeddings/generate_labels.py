import os
import json
import random
from google import genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("Please set GEMINI_API_KEY")

client = genai.Client()

input_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'data', 'video-embeddings.json')
output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'data', 'cluster_labels.json')

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Group by cluster
clusters = {}
for item in data:
    c = item['cluster']
    if c not in clusters:
        clusters[c] = []
    clusters[c].append(item['title'])

labels = {}
print("Generating labels using Gemini...", flush=True)

for c, titles in clusters.items():
    sample_size = min(60, len(titles))
    sample_titles = random.sample(titles, sample_size)
    
    prompt = "Analyze the following list of YouTube video titles. They belong to a single semantic cluster. Provide a short, concise 1 to 3 word label that best describes the overall theme or topic of these videos. Respond ONLY with the label, nothing else.\n\nTitles:\n"
    for t in sample_titles:
        prompt += f"- {t}\n"
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        label = response.text.strip().replace('"', '')
        print(f"Cluster {c}: {label}", flush=True)
        labels[str(c)] = label
    except Exception as e:
        print(f"Error for cluster {c}: {e}")
        labels[str(c)] = f"Cluster {c}"

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(labels, f, indent=2, ensure_ascii=False)

print(f"Successfully saved labels to {output_path}", flush=True)
