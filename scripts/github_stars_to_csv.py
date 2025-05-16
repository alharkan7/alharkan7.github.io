import json
import csv

input_json_file = 'public/os-bookmarks/github_stars.json'
output_csv_file = 'github_stars.csv'

# Columns for the CSV, matching the SQL table (repo_id from json 'id', created_at is default)
csv_columns = [
    'repo_id',
    'full_name', 
    'html_url', 
    'description', 
    'language', 
    'stargazers_count', 
    'forks_count', 
    'pushed_at', 
    'owner_login', 
    'owner_avatar_url',
    'starred_at'
]

try:
    with open(input_json_file, 'r', encoding='utf-8') as f_json:
        data = json.load(f_json)

    with open(output_csv_file, 'w', newline='', encoding='utf-8') as f_csv:
        writer = csv.DictWriter(f_csv, fieldnames=csv_columns)
        writer.writeheader()
        for item in data:
            row_to_write = {
                'repo_id': item.get('id'),
                'full_name': item.get('full_name'),
                'html_url': item.get('html_url'),
                'description': item.get('description'),
                'language': item.get('language'),
                'stargazers_count': item.get('stargazers_count'),
                'forks_count': item.get('forks_count'),
                'pushed_at': item.get('pushed_at'),
                'owner_login': item.get('owner', {}).get('login') if item.get('owner') else None,
                'owner_avatar_url': item.get('owner', {}).get('avatar_url') if item.get('owner') else None,
                'starred_at': item.get('starred_at')
            }
            writer.writerow(row_to_write)
            
    print(f"Successfully converted '{input_json_file}' to '{output_csv_file}'")

except FileNotFoundError:
    print(f"Error: Input file '{input_json_file}' not found.")
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from '{input_json_file}'.")
except Exception as e:
    print(f"An unexpected error occurred: {e}") 