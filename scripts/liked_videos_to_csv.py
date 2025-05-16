import json
import csv

input_json_file = 'public/os-bookmarks/liked_videos.json'
output_csv_file = 'liked_videos.csv'

# Columns for the CSV, matching the SQL table (excluding auto-generated id and default created_at)
csv_columns = [
    'title', 
    'url', 
    'video_owner_channel_id', 
    'video_owner_channel_title', 
    'published_at', 
    'thumbnail_url'
]

try:
    with open(input_json_file, 'r', encoding='utf-8') as f_json:
        data = json.load(f_json)

    with open(output_csv_file, 'w', newline='', encoding='utf-8') as f_csv:
        writer = csv.DictWriter(f_csv, fieldnames=csv_columns)
        writer.writeheader()
        for item in data:
            # Prepare a row with only the required columns
            row_to_write = {col: item.get(col) for col in csv_columns}
            writer.writerow(row_to_write)
            
    print(f"Successfully converted '{input_json_file}' to '{output_csv_file}'")

except FileNotFoundError:
    print(f"Error: Input file '{input_json_file}' not found.")
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from '{input_json_file}'.")
except Exception as e:
    print(f"An unexpected error occurred: {e}") 