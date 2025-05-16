import json
import csv

input_json_file = 'public/os-bookmarks/chrome_bookmarks.json'
output_csv_file = 'chrome_bookmarks.csv'

# Columns for the CSV
# path and parent_path are used to reconstruct hierarchy post-import
csv_columns = [
    'name',
    'type',
    'url',
    'date_added',
    'source',  # To distinguish 'bookmark_bar' or 'other'
    'path',      # Unique path for the item itself (e.g., Bookmarks bar>>Folder1>>ItemName)
    'parent_path' # Path for the parent item (e.g., Bookmarks bar>>Folder1)
]

# Path separator unlikely to be in bookmark names
PATH_SEPARATOR = ' >> '

bookmarks_list = []

def process_node(node, current_path_parts, source_name, parent_full_path):
    node_name = node.get('name', 'Unnamed')
    node_type = node.get('type')
    
    # Create the full path for the current node
    # For top-level folders like "Bookmarks bar", their name is the start of the path
    if not current_path_parts: 
        # This case is for the root folders themselves like 'Bookmarks bar' or 'Other bookmarks'
        # which are keys in the JSON, not nodes with a 'name' field in the typical sense for pathing.
        # The initial call to process_node will handle their 'name' as source_name.
        # Here we construct the path for children of these root folders.
        # If node_name is one of the root folder names, current_path_parts will be [node_name]
        item_path_parts = [node_name] 
    else:
        item_path_parts = current_path_parts + [node_name]
    
    item_full_path = PATH_SEPARATOR.join(item_path_parts)

    row = {
        'name': node_name,
        'type': node_type,
        'url': node.get('url'),
        'date_added': node.get('date_added'),
        'source': source_name, # The original top-level key ('bookmark_bar' or 'other')
        'path': item_full_path,
        'parent_path': parent_full_path
    }
    bookmarks_list.append(row)

    if node_type == 'folder':
        if 'children' in node and node['children']:
            for child in node['children']:
                process_node(child, item_path_parts, source_name, item_full_path)

try:
    with open(input_json_file, 'r', encoding='utf-8') as f_json:
        data = json.load(f_json)

    # Process 'bookmark_bar' and 'other' sections
    for source_key, source_content in data.items():
        if source_content.get('type') == 'folder':
            # The top-level folders themselves (e.g. 'Bookmarks bar', 'Other bookmarks')
            source_folder_name = source_content.get('name', source_key) # Use key if name missing
            top_level_path_parts = [source_folder_name]
            top_level_full_path = PATH_SEPARATOR.join(top_level_path_parts)
            
            folder_row = {
                'name': source_folder_name,
                'type': 'folder',
                'url': None,
                'date_added': source_content.get('date_added'),
                'source': source_key,
                'path': top_level_full_path,
                'parent_path': '' # Top-level folders have no parent in this context
            }
            bookmarks_list.append(folder_row)
            
            if 'children' in source_content:
                for child_node in source_content['children']:
                    process_node(child_node, top_level_path_parts, source_key, top_level_full_path)

    with open(output_csv_file, 'w', newline='', encoding='utf-8') as f_csv:
        writer = csv.DictWriter(f_csv, fieldnames=csv_columns)
        writer.writeheader()
        for bookmark_entry in bookmarks_list:
            writer.writerow(bookmark_entry)
            
    print(f"Successfully converted '{input_json_file}' to '{output_csv_file}'")
    print(f"Remember to handle the parent_id linkage in SQL using the 'path' and 'parent_path' columns.")

except FileNotFoundError:
    print(f"Error: Input file '{input_json_file}' not found.")
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from '{input_json_file}'.")
except Exception as e:
    print(f"An unexpected error occurred: {e}") 