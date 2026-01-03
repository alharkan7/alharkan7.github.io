#!/usr/bin/env python3
"""
Chrome Reading List Extractor

This script extracts Reading List data from Chrome. Due to how Chrome stores
Reading List data (in Sync Data LevelDB, not in the regular Bookmarks file),
there are multiple approaches:

1. **Recommended**: Parse a Google Takeout export (ReadingList.html)
2. **Alternative**: Attempt to read from Sync Data LevelDB (complex, may not work)

To use the Google Takeout method:
1. Go to https://takeout.google.com
2. Select "Chrome" and uncheck all except "ReadingList"
3. Create and download the export
4. Place the ReadingList.html file in the same directory as this script
5. Run this script

Usage:
    python3 get_reading_list.py                        # Try all methods
    python3 get_reading_list.py --takeout FILE.html   # Parse specific Takeout file
"""

import os
import json
import re
import sys
import argparse
from datetime import datetime
from pathlib import Path
from html.parser import HTMLParser


class ReadingListHTMLParser(HTMLParser):
    """Parser for Google Takeout ReadingList.html file."""
    
    def __init__(self):
        super().__init__()
        self.items = []
        self.current_item = {}
        self.in_anchor = False
        self.current_text = ""
    
    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'a':
            self.in_anchor = True
            attrs_dict = dict(attrs)
            self.current_item = {
                'url': attrs_dict.get('href', ''),
                'date_added': attrs_dict.get('add_date', ''),
            }
            self.current_text = ""
    
    def handle_endtag(self, tag):
        if tag.lower() == 'a' and self.in_anchor:
            self.in_anchor = False
            self.current_item['title'] = self.current_text.strip()
            if self.current_item.get('url'):
                # Convert Unix timestamp to readable format
                if self.current_item.get('date_added'):
                    try:
                        timestamp = int(self.current_item['date_added'])
                        self.current_item['date_added_readable'] = datetime.fromtimestamp(timestamp).isoformat()
                    except (ValueError, OSError):
                        self.current_item['date_added_readable'] = None
                self.items.append(self.current_item)
            self.current_item = {}
    
    def handle_data(self, data):
        if self.in_anchor:
            self.current_text += data


def parse_takeout_html(file_path):
    """Parse a Google Takeout ReadingList.html file."""
    print(f"Parsing Google Takeout file: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        parser = ReadingListHTMLParser()
        parser.feed(content)
        
        return parser.items
    except Exception as e:
        print(f"Error parsing Takeout HTML: {e}")
        return []


def find_takeout_files():
    """Search for potential Google Takeout ReadingList files."""
    search_paths = [
        Path.cwd(),
        Path.home() / "Downloads",
        Path.home() / "Desktop",
    ]
    
    patterns = [
        "**/ReadingList.html",
        "**/Reading*.html",
        "**/Takeout*/Chrome/ReadingList.html",
    ]
    
    found_files = []
    
    for search_path in search_paths:
        if search_path.exists():
            for pattern in patterns:
                found_files.extend(search_path.glob(pattern))
    
    return list(set(found_files))


def get_chrome_profile_path():
    """Get the default Chrome profile path based on the OS."""
    home = Path.home()
    
    # macOS
    chrome_path = home / "Library" / "Application Support" / "Google" / "Chrome" / "Default"
    
    if chrome_path.exists():
        return chrome_path
    
    # Try Chrome Beta
    chrome_beta_path = home / "Library" / "Application Support" / "Google" / "Chrome Beta" / "Default"
    if chrome_beta_path.exists():
        return chrome_beta_path
    
    raise FileNotFoundError("Could not find Chrome profile directory")


def try_leveldb_extraction(profile_path):
    """
    Attempt to extract Reading List from Chrome's Sync Data LevelDB.
    This is experimental and may not work on all Chrome versions.
    """
    print("\n📦 Attempting LevelDB extraction (experimental)...")
    
    leveldb_path = profile_path / "Sync Data" / "LevelDB"
    
    if not leveldb_path.exists():
        print(f"   LevelDB not found at: {leveldb_path}")
        return []
    
    items = []
    
    try:
        # Try using plyvel if available
        import plyvel
        
        db = plyvel.DB(str(leveldb_path), create_if_missing=False)
        
        for key, value in db:
            try:
                key_str = key.decode('utf-8', errors='ignore')
                if 'reading' in key_str.lower() or 'readinglist' in key_str.lower():
                    print(f"   Found key: {key_str[:100]}")
                    # Attempt to decode value
                    try:
                        value_str = value.decode('utf-8', errors='ignore')
                        items.append({
                            'key': key_str,
                            'value': value_str[:500]
                        })
                    except:
                        pass
            except:
                continue
        
        db.close()
        
    except ImportError:
        print("   ⚠️  'plyvel' library not installed.")
        print("   Install with: pip install plyvel")
        print("   Note: Requires LevelDB C library (brew install leveldb on macOS)")
        
        # Try ccl_chromium_reader if available
        try:
            import ccl_chromium_reader
            print("   Trying ccl_chromium_reader...")
            # This library doesn't directly support Reading List
            print("   ccl_chromium_reader doesn't have direct Reading List support")
        except ImportError:
            print("   ⚠️  'ccl_chromium_reader' library not installed.")
            print("   Install with: pip install ccl_chromium_reader")
    
    except Exception as e:
        print(f"   Error reading LevelDB: {e}")
    
    return items


def search_in_bookmarks_file(profile_path):
    """
    Search for any reading-list related entries in the Bookmarks file.
    Some Chrome versions might store Reading List here.
    """
    print("\n📑 Searching in Bookmarks file...")
    
    bookmarks_path = profile_path / "Bookmarks"
    
    if not bookmarks_path.exists():
        print(f"   Bookmarks file not found")
        return []
    
    items = []
    
    try:
        with open(bookmarks_path, 'r', encoding='utf-8') as f:
            bookmarks_data = json.load(f)
        
        def search_recursive(node, path=""):
            """Recursively search for reading list related items."""
            if isinstance(node, dict):
                name = node.get('name', '')
                node_type = node.get('type', '')
                
                # Check for reading list indicators
                if any(term in name.lower() for term in ['read later', 'reading list', 'to read']):
                    if node_type == 'folder':
                        print(f"   Found folder: {name}")
                        children = node.get('children', [])
                        for child in children:
                            if child.get('type') == 'url':
                                items.append({
                                    'title': child.get('name', 'Untitled'),
                                    'url': child.get('url', ''),
                                    'date_added': child.get('date_added', ''),
                                    'source': f"Bookmarks/{name}"
                                })
                    elif node_type == 'url':
                        items.append({
                            'title': name,
                            'url': node.get('url', ''),
                            'date_added': node.get('date_added', ''),
                            'source': path
                        })
                
                # Continue searching in children
                for key, value in node.items():
                    if isinstance(value, (dict, list)):
                        new_path = f"{path}/{name}" if name else path
                        search_recursive(value, new_path)
            
            elif isinstance(node, list):
                for item in node:
                    search_recursive(item, path)
        
        search_recursive(bookmarks_data.get('roots', {}))
        
        if not items:
            print("   No Reading List folder found in Bookmarks")
        else:
            print(f"   Found {len(items)} items")
        
    except Exception as e:
        print(f"   Error reading Bookmarks file: {e}")
    
    return items


def main():
    """Main function to extract Chrome Reading List."""
    parser = argparse.ArgumentParser(
        description='Extract Chrome Reading List',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 get_reading_list.py
  python3 get_reading_list.py --takeout ~/Downloads/ReadingList.html
  python3 get_reading_list.py --output my_reading_list.json

For best results, export your Reading List via Google Takeout:
  1. Go to https://takeout.google.com
  2. Select Chrome > ReadingList
  3. Download and extract the export
  4. Run: python3 get_reading_list.py --takeout path/to/ReadingList.html
        """
    )
    parser.add_argument('--takeout', type=str, help='Path to Google Takeout ReadingList.html file')
    parser.add_argument('--output', type=str, default='reading_list.json', help='Output JSON file name')
    args = parser.parse_args()
    
    print("=" * 60)
    print("🔖 Chrome Reading List Extractor")
    print("=" * 60)
    
    all_items = []
    
    # Method 1: Use specified Takeout file
    if args.takeout:
        takeout_path = Path(args.takeout)
        if takeout_path.exists():
            items = parse_takeout_html(takeout_path)
            if items:
                all_items.extend(items)
                print(f"✅ Found {len(items)} items from Takeout file")
        else:
            print(f"❌ Takeout file not found: {args.takeout}")
            sys.exit(1)
    
    else:
        # Method 2: Search for Takeout files
        print("\n🔍 Searching for Google Takeout ReadingList files...")
        takeout_files = find_takeout_files()
        
        if takeout_files:
            print(f"   Found {len(takeout_files)} potential file(s):")
            for tf in takeout_files:
                print(f"   - {tf}")
            
            # Use the most recently modified file
            latest_file = max(takeout_files, key=lambda p: p.stat().st_mtime)
            print(f"\n   Using: {latest_file}")
            
            items = parse_takeout_html(latest_file)
            if items:
                all_items.extend(items)
                print(f"   ✅ Found {len(items)} items")
        else:
            print("   No Takeout files found")
        
        # Method 3: Try Chrome profile
        try:
            profile_path = get_chrome_profile_path()
            print(f"\n📂 Found Chrome profile at: {profile_path}")
            
            # Try Bookmarks file
            bookmark_items = search_in_bookmarks_file(profile_path)
            if bookmark_items:
                # Avoid duplicates
                existing_urls = {item.get('url') for item in all_items}
                new_items = [item for item in bookmark_items if item.get('url') not in existing_urls]
                all_items.extend(new_items)
            
            # Try LevelDB (experimental)
            if not all_items:
                leveldb_items = try_leveldb_extraction(profile_path)
                if leveldb_items:
                    all_items.extend(leveldb_items)
        
        except FileNotFoundError as e:
            print(f"\n⚠️  {e}")
    
    # Output results
    print(f"\n{'=' * 60}")
    print(f"📊 Results: Found {len(all_items)} items in Reading List")
    print("=" * 60)
    
    if all_items:
        # Display items
        for i, item in enumerate(all_items[:20], 1):  # Show first 20
            title = item.get('title', 'Untitled')[:60]
            url = item.get('url', 'No URL')[:60]
            print(f"\n{i}. {title}")
            print(f"   🔗 {url}...")
            if item.get('date_added_readable'):
                print(f"   📅 Added: {item['date_added_readable']}")
        
        if len(all_items) > 20:
            print(f"\n   ... and {len(all_items) - 20} more items")
        
        # Save to JSON
        output_file = Path(__file__).parent / args.output
        output_data = {
            "extracted_at": datetime.now().isoformat(),
            "count": len(all_items),
            "items": all_items
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Reading list saved to: {output_file}")
    
    else:
        print("\n⚠️  No Reading List items found.")
        print("\n📝 To export your Reading List:")
        print("   1. Go to https://takeout.google.com")
        print("   2. Click 'Deselect all', then select 'Chrome'")
        print("   3. Click 'All Chrome data included' and select only 'ReadingList'")
        print("   4. Create export and download")
        print("   5. Extract and run:")
        print(f"      python3 {Path(__file__).name} --takeout path/to/ReadingList.html")
    
    return all_items


if __name__ == "__main__":
    main()
