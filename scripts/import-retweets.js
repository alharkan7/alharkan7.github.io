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

async function importRetweets() {
    const tweetsPath = join(__dirname, 'tweets.js');
    const rawData = readFileSync(tweetsPath, 'utf-8');

    // Parse Twitter export format: window.YTD.tweets.part0 = [...]
    const match = rawData.match(/window\.YTD\.tweets\.part0\s*=\s*(\[[\s\S]*\])/);
    if (!match) {
        console.error('Could not parse tweets file');
        return;
    }

    const tweetsData = JSON.parse(match[1]);
    console.log(`Found ${tweetsData.length} total tweets in file`);

    // Filter only retweets (full_text starts with "RT @")
    const retweets = tweetsData.filter((item) => {
        const fullText = item.tweet?.full_text || '';
        return fullText.startsWith('RT @');
    });

    console.log(`Found ${retweets.length} retweets (filtered from ${tweetsData.length} total tweets)`);

    // Remove duplicates within the file
    const uniqueRetweets = new Map();
    for (const item of retweets) {
        const tweetId = item.tweet.id_str;
        if (!uniqueRetweets.has(tweetId)) {
            uniqueRetweets.set(tweetId, item);
        }
    }
    console.log(`${uniqueRetweets.size} unique retweets (removed ${retweets.length - uniqueRetweets.size} duplicates)`);

    // Get all existing tweet IDs (batched)
    const allIds = Array.from(uniqueRetweets.keys());
    const existingIds = new Set();

    const checkBatchSize = 200;
    for (let i = 0; i < allIds.length; i += checkBatchSize) {
        const batch = allIds.slice(i, i + checkBatchSize);
        const { data } = await supabase
            .from('x_tweets')
            .select('id')
            .in('id', batch);
        if (data) {
            data.forEach((t) => existingIds.add(t.id));
        }
    }

    console.log(`${existingIds.size} tweets already exist in database`);

    // Filter to only new records
    const newRecords = [];
    for (const item of uniqueRetweets.values()) {
        const tweet = item.tweet;
        const tweetId = String(tweet.id_str);
        if (!existingIds.has(tweetId)) {
            // Extract original author from user_mentions (first mention is the original tweet author)
            const originalAuthor = tweet.entities?.user_mentions?.[0];
            const authorId = originalAuthor?.id_str || '';
            const authorScreenName = originalAuthor?.screen_name || '';

            newRecords.push({
                id: tweetId,
                is_bookmark: false,
                is_like: false,
                is_retweet: true,
                author_id: authorId,
                text: tweet.full_text || '',
                created_at: tweet.created_at || new Date().toISOString(),
                edit_history_tweet_ids: null,
                retweet_count: parseInt(tweet.retweet_count) || 0,
                reply_count: parseInt(tweet.reply_count) || 0,
                like_count: parseInt(tweet.favorite_count) || 0,
                quote_count: 0,
                bookmark_count: 0,
                impression_count: 0,
                article_title: null,
                entities: tweet.entities || {},
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

importRetweets().catch(console.error);