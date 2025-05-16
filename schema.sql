PRAGMA foreign_keys=OFF;

-- Table: liked_videos
DROP TABLE IF EXISTS liked_videos;
CREATE TABLE liked_videos (
    id SERIAL PRIMARY KEY,
    title TEXT,
    url TEXT UNIQUE,
    video_owner_channel_id TEXT,
    video_owner_channel_title TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: github_stars
DROP TABLE IF EXISTS github_stars;
CREATE TABLE github_stars (
    repo_id BIGINT PRIMARY KEY,
    full_name TEXT UNIQUE,
    html_url TEXT,
    description TEXT,
    language TEXT,
    stargazers_count INTEGER,
    forks_count INTEGER,
    pushed_at TIMESTAMP WITH TIME ZONE,
    owner_login TEXT,
    owner_avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: chrome_bookmarks
DROP TABLE IF EXISTS chrome_bookmarks;
CREATE TABLE chrome_bookmarks (
    id SERIAL PRIMARY KEY,
    name TEXT,
    type VARCHAR(10) CHECK (type IN ('url', 'folder')),
    url TEXT, -- Nullable for folders
    date_added BIGINT, -- Original Chrome timestamp format
    parent_id INTEGER REFERENCES chrome_bookmarks(id) ON DELETE CASCADE, -- For hierarchical structure
    source TEXT, -- e.g., 'bookmark_bar' or 'other'
    path TEXT, -- Unique path for the item, e.g., Bookmarks bar>>Folder1>>ItemName
    parent_path TEXT, -- Path for the parent item, e.g., Bookmarks bar>>Folder1
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

PRAGMA foreign_keys=ON; 