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

async function importBookmarks() {
  const bookmarksPath = join(__dirname, 'x_bookmarks.json');
  const rawData = readFileSync(bookmarksPath, 'utf-8');
  const json = JSON.parse(rawData);

  // Handle both array and {bookmarks: [...]} formats
  const tweets = Array.isArray(json) ? json : json.bookmarks || [];

  console.log(`Found ${tweets.length} bookmarks to import`);

  const records = tweets.map((tweet) => ({
    id: String(tweet.id),
    is_bookmark: true,
    is_like: false,
    author_id: tweet.author_id || tweet.author?.id || '',
    text: tweet.text || '',
    created_at: tweet.created_at || tweet.timestamp || new Date().toISOString(),
    edit_history_tweet_ids: tweet.edit_history_tweet_ids || null,
    retweet_count: tweet.public_metrics?.retweet_count || 0,
    reply_count: tweet.public_metrics?.reply_count || 0,
    like_count: tweet.public_metrics?.like_count || 0,
    quote_count: tweet.public_metrics?.quote_count || 0,
    bookmark_count: tweet.public_metrics?.bookmark_count || 0,
    impression_count: tweet.public_metrics?.impression_count || 0,
    article_title: tweet.article?.title || null,
    entities: tweet.entities || {},
  }));

  const batchSize = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { data, error } = await supabase.from('x_tweets').insert(batch).select();

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize)} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += data?.length || batch.length;
      console.log(`Inserted ${inserted}/${records.length} records`);
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Errors: ${errors}`);
}

importBookmarks().catch(console.error);
