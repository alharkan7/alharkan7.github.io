import json
import os
import platform
import sys
from pathlib import Path
import psycopg2 # Added for PostgreSQL
from dotenv import load_dotenv # Added for .env file loading

# Load .env file from the script's directory or current working directory
script_dir = Path(__file__).resolve().parent
dotenv_path_script_dir = script_dir / '.env'
dotenv_path_cwd = Path.cwd() / '.env'

if dotenv_path_script_dir.exists():
    load_dotenv(dotenv_path=dotenv_path_script_dir)
    print(f"Loaded .env file from {dotenv_path_script_dir}")
elif dotenv_path_cwd.exists():
    load_dotenv(dotenv_path=dotenv_path_cwd)
    print(f"Loaded .env file from {dotenv_path_cwd}")
else:
    print("Warning: .env file not found in script directory or current working directory. Relying on shell environment variables.", file=sys.stderr)

# Database Environment Variables - User needs to set these
DB_HOST = os.getenv("SUPABASE_DB_HOST")
DB_NAME = os.getenv("SUPABASE_DB_NAME", "postgres")
DB_USER = os.getenv("SUPABASE_DB_USER", "postgres")
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")
DB_PORT = os.getenv("SUPABASE_DB_PORT", "5432")

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

# Global counters and sets for reporting and sync logic
newly_added_count_global = 0
processed_count_global = 0
deleted_count_global = 0 # New counter for deletions
processed_paths_this_run = set() # New set to track all valid paths from current Chrome run

def insert_or_get_id(node_data, parent_id_in_db, parent_full_path, source_key, existing_paths_in_db_set, cursor, connection):
    """
    Inserts a bookmark/folder if it doesn't exist based on its path, or gets its ID if it exists.
    Updates existing_paths_in_db_set, newly_added_count_global, and processed_paths_this_run.
    """
    global newly_added_count_global, processed_paths_this_run

    node_name = node_data.get('name')
    node_type = node_data.get('type')
    node_url = node_data.get('url', None)
    node_date_added = node_data.get('date_added')
    if node_date_added is not None:
        try:
            node_date_added = int(node_date_added)
        except ValueError:
            print(f"Warning: Could not convert date_added '{node_date_added}' to int for '{node_name}'. Setting to NULL.", file=sys.stderr)
            node_date_added = None

    current_full_path = f"{parent_full_path}>>{node_name}" if parent_full_path else node_name
    item_db_id = None

    if current_full_path in existing_paths_in_db_set:
        try:
            cursor.execute("SELECT id FROM chrome_bookmarks WHERE path = %s", (current_full_path,))
            result = cursor.fetchone()
            if result:
                item_db_id = result[0]
                processed_paths_this_run.add(current_full_path) # Mark as processed this run
            else:
                print(f"Info: Path '{current_full_path}' was in initial DB set but no ID found. Attempting insert.", file=sys.stderr)
        except psycopg2.Error as e:
            print(f"Error fetching ID for existing path '{current_full_path}': {e}. Attempting insert.", file=sys.stderr)
            connection.rollback()
    
    if item_db_id is None:
        sql = """
            INSERT INTO chrome_bookmarks (name, type, url, date_added, parent_id, source, path, parent_path)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (path) DO UPDATE SET
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                url = EXCLUDED.url,
                date_added = EXCLUDED.date_added,
                parent_id = EXCLUDED.parent_id,
                source = EXCLUDED.source,
                parent_path = EXCLUDED.parent_path
            RETURNING id, (xmax = 0);
        """
        try:
            cursor.execute(sql, (
                node_name, node_type, node_url, node_date_added,
                parent_id_in_db, source_key, current_full_path,
                parent_full_path if parent_full_path else None
            ))
            result = cursor.fetchone()
            item_db_id = result[0]
            was_inserted = result[1] 
            
            if was_inserted:
                 newly_added_count_global += 1
            
            existing_paths_in_db_set.add(current_full_path) # Add to set of paths known to be in DB (either old or new)
            processed_paths_this_run.add(current_full_path) # Mark as processed this run

        except psycopg2.Error as e:
            print(f"Database error (INSERT/UPDATE) for '{current_full_path}': {e}", file=sys.stderr)
            connection.rollback()
            raise 
    
    return item_db_id

def process_filtered_structure_for_db(node_data, parent_id_in_db, parent_full_path, source_key, existing_paths_in_db_set, cursor, connection):
    """
    Recursively traverses the filtered bookmark structure and inserts items into the database.
    node_data comes from the output of extract_bookmarks.
    """
    global processed_count_global
    processed_count_global += 1

    current_item_db_id = None
    node_name = node_data.get('name') # For constructing the child's parent_full_path

    try:
        current_item_db_id = insert_or_get_id(node_data, parent_id_in_db, parent_full_path, source_key, existing_paths_in_db_set, cursor, connection)
    except psycopg2.Error:
        # Error already printed and handled by insert_or_get_id (rollback, re-raise)
        # Stop processing this node and its children if insert/get_id failed criticaly.
        return

    if node_data.get('type') == 'folder' and current_item_db_id is not None:
        # Construct the parent_full_path for children of *this* node
        childrens_parent_path = f"{parent_full_path}>>{node_name}" if parent_full_path else node_name
        for child_node in node_data.get('children', []):
            process_filtered_structure_for_db(child_node, current_item_db_id, 
                                             childrens_parent_path,
                                             source_key, existing_paths_in_db_set, cursor, connection)

def main():
    global newly_added_count_global, processed_count_global, deleted_count_global, processed_paths_this_run
    newly_added_count_global = 0
    processed_count_global = 0
    deleted_count_global = 0 
    processed_paths_this_run = set()

    if not DB_HOST or not DB_PASSWORD:
        print("Error: Database credentials (SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD) not set in environment variables.", file=sys.stderr)
        sys.exit(1)

    bookmarks_path = get_chrome_bookmarks_path()
    # output_filename = "chrome_bookmarks.json" # No longer primary output
    # script_dir = Path(__file__).parent.resolve()
    # output_path = script_dir / output_filename # No longer primary output

    allowed_folders = {
        "AI", "Startups & Business", "Tech & Engineering", "Research",
        "Academic Tools", "Reference/Citation Map", "Design & Marketing", "Journalism"
    }

    if not bookmarks_path:
        print(f"Error: Could not automatically locate a Chrome bookmarks file.", file=sys.stderr)
        print("Please ensure Chrome is installed and check your profile directories.", file=sys.stderr)
        sys.exit(1)

    conn = None
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        cur = conn.cursor()
        print("Successfully connected to the database.")

        existing_db_paths = set()
        try:
            cur.execute("SELECT path FROM chrome_bookmarks")
            for row in cur.fetchall():
                if row[0] is not None: # Paths can be NULL if there was an issue
                    existing_db_paths.add(row[0])
            print(f"Fetched {len(existing_db_paths)} existing bookmark paths from the database.")
        except psycopg2.Error as e:
            print(f"Error fetching existing bookmarks: {e}", file=sys.stderr)
            if conn: conn.close()
            sys.exit(1)
        
        bookmarks_data = None
        try:
            with open(bookmarks_path, 'r', encoding='utf-8') as f:
                bookmarks_data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error reading or parsing the bookmarks file: {e}", file=sys.stderr)
            if conn: conn.close()
            sys.exit(1)
        except IOError as e:
            print(f"Error opening the bookmarks file: {e}", file=sys.stderr)
            if conn: conn.close()
            sys.exit(1)

        roots = bookmarks_data.get('roots')
        if not roots or not isinstance(roots, dict):
            print("Error: 'roots' key not found or not a dictionary in bookmarks file.", file=sys.stderr)
            if conn: conn.close()
            sys.exit(1)

        # This structure will hold the filtered bookmarks, similar to the old structured_bookmarks
        filtered_roots_for_db_processing = {}
        source_keys_processed_this_run = [] # Track which roots we are managing

        for root_key, root_node_from_chrome in roots.items():
            if root_node_from_chrome and root_node_from_chrome.get('type') == 'folder':
                current_root_data = {
                    'type': 'folder',
                    'name': root_node_from_chrome.get('name', root_key),
                    'date_added': root_node_from_chrome.get('date_added'),
                    'children': []
                }
                if 'children' in root_node_from_chrome:
                    for child_of_root in root_node_from_chrome.get('children', []):
                        processed_child = extract_bookmarks(child_of_root, allowed_folders)
                        if processed_child:
                            current_root_data['children'].append(processed_child)
                
                if current_root_data['name']:
                     filtered_roots_for_db_processing[root_key] = current_root_data
                     if root_key not in source_keys_processed_this_run: # Ensure we only add once
                         source_keys_processed_this_run.append(root_key)
            else:
                print(f"Skipping root '{root_key}' as it's not a valid folder or is missing.", file=sys.stderr)

        if not filtered_roots_for_db_processing:
            print("Warning: No valid bookmark roots found or all were empty after initial processing.", file=sys.stderr)
        else:
            for root_source_key, root_data_to_insert in filtered_roots_for_db_processing.items():
                print(f"\nProcessing and syncing bookmarks for root: {root_data_to_insert.get('name')} (Source: {root_source_key})")
                try:
                    process_filtered_structure_for_db(
                        node_data=root_data_to_insert,
                        parent_id_in_db=None,
                        parent_full_path=None, 
                        source_key=root_source_key,
                        existing_paths_in_db_set=existing_db_paths, 
                        cursor=cur,
                        connection=conn
                    )
                    conn.commit() 
                    print(f"Successfully processed and committed root: {root_data_to_insert.get('name')}")
                except Exception as e:
                    print(f"Critical error while processing root '{root_data_to_insert.get('name')}' : {e}. Rolling back changes for this root.", file=sys.stderr)
                    conn.rollback()
        
        # --- Deletion Logic ---
        if source_keys_processed_this_run:
            print("\n--- Starting Deletion Sync ---")
            db_paths_for_managed_sources = set()
            try:
                cur.execute("SELECT path FROM chrome_bookmarks WHERE source = ANY(%s)", (source_keys_processed_this_run,))
                for row in cur.fetchall():
                    if row[0] is not None:
                        db_paths_for_managed_sources.add(row[0])
                print(f"Fetched {len(db_paths_for_managed_sources)} paths from DB for managed sources: {source_keys_processed_this_run}")

                paths_to_delete = db_paths_for_managed_sources - processed_paths_this_run
                
                if paths_to_delete:
                    print(f"Found {len(paths_to_delete)} orphaned paths to delete.")
                    # Example: print first 5 paths to be deleted for logging
                    # for i, p_del in enumerate(list(paths_to_delete)[:5]):
                    #     print(f"  Preview delete: {p_del}")
                    # if len(paths_to_delete) > 5:
                    #     print(f"  ...and {len(paths_to_delete) - 5} more.")

                    for path_to_del in paths_to_delete:
                        try:
                            # Ensure deletion is only for managed sources to be safe
                            cur.execute("DELETE FROM chrome_bookmarks WHERE path = %s AND source = ANY(%s)", 
                                        (path_to_del, source_keys_processed_this_run))
                            if cur.rowcount > 0:
                                deleted_count_global += cur.rowcount
                        except psycopg2.Error as e_del:
                            print(f"Error deleting path '{path_to_del}': {e_del}", file=sys.stderr)
                            conn.rollback() # Rollback this specific deletion attempt
                            # Potentially re-raise or log more severely if a single deletion failure is critical
                    
                    if deleted_count_global > 0: # Only commit if actual deletions happened
                        conn.commit()
                        print(f"Committed deletion of {deleted_count_global} orphaned items.")
                    else:
                        # This could happen if rowcount was 0 for all attempted deletions or errors occurred
                        print("No items were confirmed deleted in this batch (or errors occurred during deletion attempts).")
                else:
                    print("No orphaned paths found. Database is in sync with current Chrome bookmarks for managed sources.")

            except psycopg2.Error as e_sync:
                print(f"Error during deletion sync phase: {e_sync}", file=sys.stderr)
                conn.rollback() 
        else:
            print("\nSkipping deletion sync as no bookmark sources were processed in this run.")

        print("\n--- Sync Summary ---")
        print(f"Total items processed from Chrome data (after filtering): {processed_count_global}")
        print(f"New items added to the database: {newly_added_count_global}")
        print(f"Items deleted from the database: {deleted_count_global}") # New summary line
        
        if processed_count_global == 0 and newly_added_count_global == 0 and deleted_count_global == 0:
             if not any(filtered_roots_for_db_processing.values()):
                 print("No bookmarks matched the allowed folder names or roots were empty.")
             else:
                 print("All found and filtered bookmarks were already present in the database.")

    except psycopg2.Error as e:
        print(f"Database connection or operational error: {e}", file=sys.stderr)
        if conn:
            conn.rollback() # Rollback any pending transaction
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    main() 