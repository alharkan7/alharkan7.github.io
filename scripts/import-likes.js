import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse .env manually
const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => {
      const [key, ...rest] = line.split('=');
      return [key.trim(), rest.join('=').trim()];
    })
);

const supabaseUrl = envVars.SUPABASE_URL || envVars.PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_ANON_KEY || envVars.PUBLIC_SUPABASE_ANON_KEY;

console.log('Connecting to Supabase...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function importLikes() {
  const likesPath = join(__dirname, 'x_likes.js');
  const rawData = readFileSync(likesPath, 'utf-8');

  // Parse Twitter export format: window.YTD.like.part0 = [...]
  const match = rawData.match(/window\.YTD\.like\.part0\s*=\s*(\[[\s\S]*\])/);
  if (!match) {
    console.error('Could not parse likes file');
    return;
  }

  const likesData = JSON.parse(match[1]);
  console.log(`Found ${likesData.length} likes in file`);

  // Remove duplicates within the file
  const uniqueLikes = new Map();
  for (const item of likesData) {
    const tweetId = item.like.tweetId;
    if (!uniqueLikes.has(tweetId)) {
      uniqueLikes.set(tweetId, item);
    }
  }
  console.log(`${uniqueLikes.size} unique likes (removed ${likesData.length - uniqueLikes.size} duplicates)`);

  // Get all existing tweet IDs (batched)
  const allIds = Array.from(uniqueLikes.keys());
  const existingIds = new Set();

  const checkBatchSize = 200;
  for (let i = 0; i < allIds.length; i += checkBatchSize) {
    const batch = allIds.slice(i, i + checkBatchSize);
    const { data } = await supabase
      .from('x_tweets')
      .select('id')
      .in('id', batch);
    if (data) {
      data.forEach(t => existingIds.add(t.id));
    }
  }

  console.log(`${existingIds.size} tweets already exist in database`);

  // Filter to only new records
  const newRecords = [];
  for (const item of uniqueLikes.values()) {
    const tweetId = String(item.like.tweetId);
    if (!existingIds.has(tweetId)) {
      newRecords.push({
        id: tweetId,
        is_bookmark: false,
        is_like: true,
        author_id: '',  // Not available in Twitter export
        text: item.like.fullText || '',
        created_at: new Date().toISOString(),  // Not available in export
        edit_history_tweet_ids: null,
        retweet_count: 0,
        reply_count: 0,
        like_count: 0,
        quote_count: 0,
        bookmark_count: 0,
        impression_count: 0,
        article_title: null,
        entities: {},
      });
    }
  }

  console.log(`Will insert ${newRecords.length} new records`);

  // Insert new records only
  let inserted = 0;
  const batchSize = 500;

  for (let i = 0; i < newRecords.length; i += batchSize) {
    const batch = newRecords.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('x_tweets')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize)} error:`, error.message);
    } else {
      inserted += data?.length || batch.length;
      console.log(`Inserted ${inserted}/${newRecords.length} records`);
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped (existing): ${existingIds.size}`);
}

importLikes().catch(console.error);
