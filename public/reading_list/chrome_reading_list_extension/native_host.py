#!/usr/bin/env python3
"""
Native Messaging Host for Chrome Reading List Extension

This script receives reading list data from the Chrome extension via
Native Messaging protocol and saves it to a SQLite database.

The database will be created at:
  ~/Documents/Repositories/alharkan7.github.io/public/os-bookmarks/bookmarks.db

With a table named 'reading_list'.
"""

import sys
import json
import struct
import sqlite3
from datetime import datetime
from pathlib import Path


# Configuration
DB_PATH = Path.home() / "Documents" / "Repositories" / "alharkan7.github.io" / "public" / "os-bookmarks" / "bookmarks.db"
LOG_PATH = Path.home() / ".reading_list_sync.log"


def log(message):
    """Log message to file for debugging."""
    with open(LOG_PATH, 'a') as f:
        timestamp = datetime.now().isoformat()
        f.write(f"[{timestamp}] {message}\n")


def get_message():
    """Read a message from stdin."""
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None
    message_length = struct.unpack('=I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)


def send_message(message):
    """Send a message to stdout."""
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('=I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def init_database():
    """Initialize the database and create reading_list table if not exists."""
    # Create parent directories if they don't exist
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create reading_list table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reading_list (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE NOT NULL,
            title TEXT,
            has_been_read BOOLEAN DEFAULT 0,
            creation_time INTEGER,
            last_update_time INTEGER,
            synced_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create index on url for faster lookups
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_reading_list_url ON reading_list(url)
    ''')
    
    conn.commit()
    conn.close()
    
    log(f"Database initialized at {DB_PATH}")


def sync_reading_list(items):
    """
    Sync reading list items to the database.
    Uses UPSERT (INSERT OR REPLACE) to overwrite existing items.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    synced_at = datetime.now().isoformat()
    
    inserted = 0
    updated = 0
    
    for item in items:
        url = item.get('url', '')
        title = item.get('title', '')
        has_been_read = 1 if item.get('hasBeenRead', False) else 0
        creation_time = item.get('creationTime')
        last_update_time = item.get('lastUpdateTime')
        
        # Check if item exists
        cursor.execute('SELECT id FROM reading_list WHERE url = ?', (url,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing
            cursor.execute('''
                UPDATE reading_list 
                SET title = ?, 
                    has_been_read = ?, 
                    creation_time = ?,
                    last_update_time = ?,
                    synced_at = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE url = ?
            ''', (title, has_been_read, creation_time, last_update_time, synced_at, url))
            updated += 1
        else:
            # Insert new
            cursor.execute('''
                INSERT INTO reading_list (url, title, has_been_read, creation_time, last_update_time, synced_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (url, title, has_been_read, creation_time, last_update_time, synced_at))
            inserted += 1
    
    conn.commit()
    conn.close()
    
    log(f"Sync complete: {inserted} new, {updated} updated, {len(items)} total")
    
    return {
        'inserted': inserted,
        'updated': updated,
        'total': len(items)
    }


def get_stats():
    """Get statistics from the database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM reading_list')
        total = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM reading_list WHERE has_been_read = 1')
        read_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT MAX(synced_at) FROM reading_list')
        last_sync = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total': total,
            'read': read_count,
            'unread': total - read_count,
            'last_sync': last_sync
        }
    except Exception as e:
        log(f"Error getting stats: {e}")
        return None


def main():
    """Main entry point for native messaging host."""
    log("Native host started")
    
    try:
        # Initialize database
        init_database()
        
        # Read message from extension
        message = get_message()
        
        if not message:
            log("No message received")
            send_message({'status': 'error', 'error': 'No message received'})
            return
        
        log(f"Received message: action={message.get('action')}, items={message.get('count', 0)}")
        
        action = message.get('action')
        
        if action == 'sync':
            items = message.get('items', [])
            result = sync_reading_list(items)
            send_message({
                'status': 'success',
                'action': 'sync',
                'result': result,
                'database': str(DB_PATH)
            })
        
        elif action == 'stats':
            stats = get_stats()
            send_message({
                'status': 'success',
                'action': 'stats',
                'result': stats
            })
        
        else:
            send_message({
                'status': 'error',
                'error': f'Unknown action: {action}'
            })
        
    except Exception as e:
        log(f"Error: {e}")
        send_message({
            'status': 'error',
            'error': str(e)
        })


if __name__ == '__main__':
    main()
