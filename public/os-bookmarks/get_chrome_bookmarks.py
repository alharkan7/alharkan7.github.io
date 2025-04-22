import json
import os
import platform
import sys
from pathlib import Path

def get_chrome_bookmarks_path():
    """Gets the path to the Chrome bookmarks file based on the OS, checking profiles."""
    system = platform.system()
    base_path = None

    if system == "Windows":
        # Path: %LOCALAPPDATA%\Google\Chrome\User Data\Default\Bookmarks
        app_data = os.getenv('LOCALAPPDATA')
        if app_data:
            base_path = Path(app_data) / "Google" / "Chrome" / "User Data"
    elif system == "Darwin": # macOS
        # Path: ~/Library/Application Support/Google/Chrome/Default/Bookmarks
        home = Path.home()
        base_path = home / "Library" / "Application Support" / "Google" / "Chrome"
    elif system == "Linux":
        # Path: ~/.config/google-chrome/Default/Bookmarks
        home = Path.home()
        # Paths can vary: google-chrome, google-chrome-stable, chromium
        for browser in ["google-chrome", "google-chrome-stable", "chromium"]:
            potential_path = home / ".config" / browser
            if potential_path.exists():
                base_path = potential_path
                break
    else:
        return None # Unsupported OS

    if not base_path or not base_path.exists():
        print(f"Error: Chrome User Data directory not found at expected location for {system}.", file=sys.stderr)
        return None

    # 1. Check Default profile first
    default_bookmarks = base_path / "Default" / "Bookmarks"
    if default_bookmarks.exists():
        print(f"Found bookmarks in Default profile: {default_bookmarks}")
        return default_bookmarks

    # 2. If not in Default, check other Profile directories
    print("Bookmarks not found in Default profile, checking other profiles (Profile 1, Profile 2, etc.)...")
    try:
        for item in base_path.iterdir():
            if item.is_dir() and item.name.startswith("Profile "):
                profile_bookmarks = item / "Bookmarks"
                if profile_bookmarks.exists():
                    print(f"Found bookmarks in profile '{item.name}': {profile_bookmarks}")
                    return profile_bookmarks
    except OSError as e:
        print(f"Error scanning profile directories: {e}", file=sys.stderr)
        # Continue execution, maybe Default was the only one intended

    print("No Bookmarks file found in Default or other Profile directories.", file=sys.stderr)
    return None

def extract_bookmarks(node, allowed_folders):
    """Recursively extracts bookmarks, filtering by allowed folder names."""
    if not isinstance(node, dict):
        return None

    node_type = node.get('type')
    node_name = node.get('name')

    if node_type == 'url':
        # Keep URL if its parent folder was allowed (this is determined by the caller)
        if 'name' in node and 'url' in node:
            output = {'type': 'url', 'name': node.get('name'), 'url': node.get('url')}
            if 'date_added' in node: output['date_added'] = node.get('date_added')
            return output
        else:
            return None # Skip malformed URL entries

    elif node_type == 'folder':
        # Only process this folder fully if its name is in the allowed list
        if node_name in allowed_folders:
            if 'children' in node:
                processed_children = []
                for child in node.get('children', []):
                    # Recursively call for children.
                    # The recursive call handles whether the child should be kept.
                    processed_child = extract_bookmarks(child, allowed_folders)
                    # Keep direct URLs or subfolders that are *also* allowed
                    if processed_child:
                         if processed_child.get('type') == 'url':
                             processed_children.append(processed_child)
                         # Only include sub-folders if they passed the name check in their own call
                         elif processed_child.get('type') == 'folder':
                             processed_children.append(processed_child)

                # Construct the output for the allowed folder
                output = {'type': 'folder', 'name': node_name, 'children': processed_children}
                if 'date_added' in node: output['date_added'] = node.get('date_added')
                return output
            else:
                 # Skip malformed folder entries even if name matches
                 return None
        else:
            # Folder name not allowed, return None to prune this branch
            return None
    else:
        # Unknown type, ignore
        return None

def main():
    bookmarks_path = get_chrome_bookmarks_path()
    output_filename = "chrome_bookmarks.json"
    script_dir = Path(__file__).parent.resolve()
    output_path = script_dir / output_filename

    # Define the set of allowed folder names
    allowed_folders = {
        "AI", "Startups & Business", "Tech & Engineering", "Research",
        "Academic Tools", "Reference/Citation Map", "Design & Marketing", "Journalism"
    }

    if not bookmarks_path:
        print(f"Error: Could not automatically locate a Chrome bookmarks file.", file=sys.stderr)
        print("Please ensure Chrome is installed and check your profile directories.", file=sys.stderr)
        sys.exit(1)

    structured_bookmarks = {}
    try:
        with open(bookmarks_path, 'r', encoding='utf-8') as f:
            bookmarks_data = json.load(f)
            roots = bookmarks_data.get('roots')
            if not roots or not isinstance(roots, dict):
                print("Error: 'roots' key not found or not a dictionary in bookmarks file.", file=sys.stderr)
                sys.exit(1)

            # Process each root (bookmark_bar, other, synced)
            for root_key, root_node in roots.items():
                 # Root nodes ('bookmark_bar', etc.) act as containers.
                 # We process their children using the filtering logic.
                 if root_node and root_node.get('type') == 'folder' and 'children' in root_node:
                     processed_children = []
                     for child in root_node.get('children', []):
                         # Apply filtering starting from the direct children of the root
                         processed_child = extract_bookmarks(child, allowed_folders)
                         if processed_child:
                             processed_children.append(processed_child)

                     # Reconstruct the root folder with only the filtered children
                     # Only add the root if it contains any children after filtering
                     if processed_children:
                         structured_bookmarks[root_key] = {
                             'type': 'folder',
                             'name': root_node.get('name', root_key),
                             'children': processed_children
                         }
                         # Optionally add date_added for the root if needed/available
                         if 'date_added' in root_node:
                              structured_bookmarks[root_key]['date_added'] = root_node.get('date_added')
                     # else: # If no children remain after filtering, optionally skip this root entirely
                     #    print(f"Skipping empty root '{root_key}' after filtering.")


                 else:
                      # Handle cases where a root might be empty or malformed before filtering
                     structured_bookmarks[root_key] = {
                         'type': 'folder',
                         'name': root_node.get('name', root_key) if isinstance(root_node, dict) else root_key,
                         'children': []
                     }


    except json.JSONDecodeError as e:
        print(f"Error reading or parsing the bookmarks file: {e}", file=sys.stderr)
        sys.exit(1)
    except IOError as e:
        print(f"Error opening the bookmarks file: {e}", file=sys.stderr)
        sys.exit(1)

    # Check if any bookmarks remain after filtering
    if not structured_bookmarks or all(not root.get('children') for root in structured_bookmarks.values()):
        print(f"Warning: No bookmarks found matching the allowed folder names in {allowed_folders}.", file=sys.stderr)
        # Decide if you want to write an empty JSON or exit
        # Writing an empty/filtered JSON for consistency

    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(structured_bookmarks, f, indent=4, ensure_ascii=False)

        # Recalculate total URLs based on the filtered structure
        total_urls = 0
        def count_urls(node):
            nonlocal total_urls
            if isinstance(node, dict):
                if node.get('type') == 'url':
                    total_urls += 1
                elif node.get('type') == 'folder':
                    for child in node.get('children', []):
                        count_urls(child)
            elif isinstance(node, list):
                 for item in node:
                      count_urls(item)

        # Iterate through the root folders ('bookmark_bar', 'other', etc.) in the dictionary
        for root_node in structured_bookmarks.values():
            count_urls(root_node) # Count URLs within each root folder

        if total_urls > 0:
            print(f"Successfully extracted {total_urls} filtered bookmarks to {output_path}")
        else:
            print(f"Filtered bookmarks saved to {output_path}, but no URLs matched the criteria.")


    except IOError as e:
        print(f"Error writing to the output file '{output_path}': {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 