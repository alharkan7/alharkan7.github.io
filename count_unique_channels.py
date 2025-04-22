import json

def count_unique_channels(json_file_path):
    """
    Counts the number of unique video_owner_channel_id values in a JSON file.

    Args:
        json_file_path (str): The path to the JSON file.

    Returns:
        int: The number of unique channel IDs, or None if an error occurs.
    """
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found at {json_file_path}")
        return None
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {json_file_path}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while reading the file: {e}")
        return None

    if not isinstance(data, list):
        print("Error: JSON data is not a list of objects.")
        return None

    unique_channel_ids = set()
    for item in data:
        if isinstance(item, dict) and 'video_owner_channel_id' in item:
            unique_channel_ids.add(item['video_owner_channel_id'])
        # else:
        #     print(f"Warning: Skipping item due to missing 'video_owner_channel_id' or incorrect format: {item}")


    return len(unique_channel_ids)

if __name__ == "__main__":
    file_path = 'public/os-bookmarks/liked_videos.json'
    unique_count = count_unique_channels(file_path)

    if unique_count is not None:
        print(f"Found {unique_count} unique channel IDs in {file_path}") 