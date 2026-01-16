# ImageKit CDN Migration Scripts

These scripts automate the migration of images from the local `public/` folder to ImageKit CDN.

## Prerequisites

Install required dependencies:

```bash
npm install imagekit glob dotenv
```

Ensure `.env` has these variables:
```
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/raihankalla"
IMAGEKIT_PUBLIC_KEY="your_public_key"
IMAGEKIT_PRIVATE_KEY="your_private_key"
```

## Usage

### Step 1: Generate Image Inventory

Scans the `public/` folder and creates a list of all images to migrate.

```bash
node scripts/imagekit-migration/1-inventory.js
```

**Output:** `inventory.json` - List of all images with paths and sizes.

---

### Step 2: Upload Images to ImageKit

Uploads all images to ImageKit CDN, preserving folder structure.

```bash
node scripts/imagekit-migration/2-upload.js
```

**Features:**
- Resumable: If interrupted, re-run to continue from where it stopped
- Progress tracking: Saves progress after each upload
- Error handling: Logs failed uploads for retry

**Output:**
- `mapping.json` - Maps local paths to CDN URLs
- `upload-progress.json` - Tracks upload progress

---

### Step 3: Replace Image Paths in Source Files

Replaces all local image references with CDN URLs.

```bash
# Preview changes (dry run)
node scripts/imagekit-migration/3-replace.js --dry-run

# Apply changes
node scripts/imagekit-migration/3-replace.js
```

**Files processed:**
- `src/**/*.md` - Markdown blog posts
- `src/**/*.html` - HTML pages
- `src/**/*.astro` - Astro components

**Excluded:**
- `fonts.css` (fonts stay local)
- `os-bookmarks/` directory

**Output:** `replacement-report.json` - Detailed log of all replacements

---

### Step 4: Cleanup Local Files (Optional)

Removes local image files that were successfully migrated to ImageKit.

```bash
# Preview what will be deleted (dry run)
node scripts/imagekit-migration/4-cleanup.js --dry-run

# Delete files (will ask for confirmation)
node scripts/imagekit-migration/4-cleanup.js

# Delete files without confirmation prompt
node scripts/imagekit-migration/4-cleanup.js --force
```

**Features:**
- Only deletes files that were successfully uploaded (checks mapping.json)
- Cleans up empty directories after deletion
- Supports dry-run mode to preview changes
- Shows space that will be freed

---

## Files Generated

| File | Description |
|------|-------------|
| `inventory.json` | List of images to migrate |
| `mapping.json` | Local path → CDN URL mapping |
| `upload-progress.json` | Upload progress for resumability |
| `replacement-report.json` | Log of all path replacements |

---

## Rollback

If needed, use Git to revert changes:

```bash
git checkout -- src/
```

The original images in `public/` are NOT deleted by these scripts. You can manually remove them after verifying everything works.
