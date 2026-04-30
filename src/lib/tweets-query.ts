import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface TweetRow {
  id: string;
  text: string;
  created_at: string;
  is_like: boolean;
  is_bookmark: boolean;
  is_retweet: boolean;
}

export interface TweetFilters {
  showBookmarks: boolean;
  showLikes: boolean;
  showRetweets: boolean;
}

const HIDDEN_SUBSTR =
  "unable to view this Post because this account owner limits who can view their Posts";

export const TWEETS_PAGE_SIZE = 30;

export function createTweetsSupabase(): SupabaseClient | null {
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function parseTweetFilters(searchParams: URLSearchParams): TweetFilters {
  const has =
    searchParams.has("bookmarks") ||
    searchParams.has("likes") ||
    searchParams.has("retweets");
  if (!has) {
    return { showBookmarks: false, showLikes: false, showRetweets: true };
  }
  return {
    showBookmarks: searchParams.get("bookmarks") === "true",
    showLikes: searchParams.get("likes") === "true",
    showRetweets: searchParams.get("retweets") === "true",
  };
}

function escapeIlike(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function applyTypeFilter(q: any, f: TweetFilters) {
  const cols: string[] = [];
  if (f.showBookmarks) cols.push("is_bookmark");
  if (f.showLikes) cols.push("is_like");
  if (f.showRetweets) cols.push("is_retweet");

  if (cols.length === 0) {
    return q.or("is_like.eq.true,is_bookmark.eq.true,is_retweet.eq.true");
  }
  if (cols.length === 1) {
    return q.eq(cols[0], true);
  }
  if (cols.length === 2) {
    return q.or(`${cols[0]}.eq.true,${cols[1]}.eq.true`);
  }
  return q.or("is_like.eq.true,is_bookmark.eq.true,is_retweet.eq.true");
}

/** Base query for x_tweets with nav filters + search + hidden-text exclusion. */
function filteredTweetsQuery(
  supabase: SupabaseClient,
  filters: TweetFilters,
  searchRaw: string,
  select: string,
  options?: { count?: "exact"; head?: boolean },
) {
  let q: any = supabase
    .from("x_tweets")
    .select(select, options ?? {})
    .not("text", "ilike", `%${HIDDEN_SUBSTR}%`);
  q = applyTypeFilter(q, filters);
  const search = searchRaw.trim();
  if (search) q = q.ilike("text", `%${escapeIlike(search)}%`);
  return q;
}

/** Newest snowflake ID first, using the indexed id_num bigint column in Postgres. */
export async function getTweetsPage(
  supabase: SupabaseClient,
  filters: TweetFilters,
  searchRaw: string,
  page: number,
): Promise<{
  rows: TweetRow[];
  totalCount: number;
  error: string | null;
}> {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * TWEETS_PAGE_SIZE;
  const to = from + TWEETS_PAGE_SIZE - 1;

  const [countResult, rowsResult] = await Promise.all([
    filteredTweetsQuery(supabase, filters, searchRaw, "*", {
      count: "exact",
      head: true,
    }),
    filteredTweetsQuery(
      supabase,
      filters,
      searchRaw,
      "id, text, created_at, is_like, is_bookmark, is_retweet",
    )
      .order("id_num", { ascending: false })
      .range(from, to),
  ]);

  if (countResult.error) {
    return { rows: [], totalCount: 0, error: countResult.error.message };
  }
  if (rowsResult.error) {
    return { rows: [], totalCount: 0, error: rowsResult.error.message };
  }

  const totalCount = countResult.count ?? 0;
  const rows = (rowsResult.data ?? []) as TweetRow[];

  return { rows, totalCount, error: null };
}

/** Small follow-up query for JSON-LD / structured data (first 100 by snowflake order). */
export async function getStructuredTweetItems(
  supabase: SupabaseClient,
): Promise<Array<{ name: string; url: string }>> {
  const { data, error } = await supabase
    .from("x_tweets")
    .select("id, text")
    .or("is_like.eq.true,is_bookmark.eq.true,is_retweet.eq.true")
    .not("text", "ilike", `%${HIDDEN_SUBSTR}%`)
    .order("id_num", { ascending: false })
    .limit(100);

  if (error || !data?.length) return [];

  return data.map((tweet) => ({
    name:
      (tweet.text || "").substring(0, 100) +
      ((tweet.text || "").length > 100 ? "..." : ""),
    url: `https://twitter.com/i/web/status/${tweet.id}`,
  }));
}

export async function getLatestTweetDate(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("x_tweets")
    .select("created_at")
    .or("is_like.eq.true,is_bookmark.eq.true,is_retweet.eq.true")
    .not("text", "ilike", `%${HIDDEN_SUBSTR}%`)
    .order("id_num", { ascending: false })
    .limit(1);

  if (error || !data?.[0]?.created_at) return null;
  return data[0].created_at as string;
}

export function tweetHeadingLabel(filters: TweetFilters): string {
  const names: string[] = [];
  if (filters.showBookmarks) names.push("Bookmarks");
  if (filters.showLikes) names.push("Likes");
  if (filters.showRetweets) names.push("Retweets");
  if (names.length === 0 || names.length === 3) return "Saved posts";
  if (names.length === 1) {
    if (filters.showRetweets) return "Retweets";
    if (filters.showLikes) return "Likes";
    return "Bookmarks";
  }
  return names.join(" & ");
}

export function flipTweetFilter(
  f: TweetFilters,
  key: keyof TweetFilters,
): TweetFilters {
  return {
    showBookmarks:
      key === "showBookmarks" ? !f.showBookmarks : f.showBookmarks,
    showLikes: key === "showLikes" ? !f.showLikes : f.showLikes,
    showRetweets:
      key === "showRetweets" ? !f.showRetweets : f.showRetweets,
  };
}

export function tweetsListUrl(
  page: number,
  filters: TweetFilters,
  search: string,
): string {
  const sp = new URLSearchParams();
  const isDefault =
    !filters.showBookmarks &&
    !filters.showLikes &&
    filters.showRetweets;
  if (!isDefault) {
    sp.set("bookmarks", String(filters.showBookmarks));
    sp.set("likes", String(filters.showLikes));
    sp.set("retweets", String(filters.showRetweets));
  }
  const q = search.trim();
  if (q) sp.set("search", q);

  const safePage = Math.max(1, page);
  const query = sp.toString();
  const qs = query ? `?${query}` : "";

  if (safePage <= 1) return `/tweets${qs}`;
  return `/tweets/${safePage}${qs}`;
}

export interface TweetsViewModel {
  currentPage: number;
  rows: TweetRow[];
  totalCount: number;
  totalPages: number;
  loadError: string | null;
  filters: TweetFilters;
  searchRaw: string;
  structuredDataItems: Array<{ name: string; url: string }>;
  lastUpdateDate: string;
  headingLabel: string;
  permalink: string;
  hrefBookmarks: string;
  hrefLikes: string;
  hrefRetweets: string;
  hrefPrev: string | null;
  hrefNext: string | null;
  filterNonDefault: boolean;
}

export type TweetsResolveResult =
  | { redirectTo: string }
  | { view: TweetsViewModel };

export async function resolveTweetsPage(
  requestUrl: URL,
  site: URL | undefined,
  currentPageInput: number,
): Promise<TweetsResolveResult> {
  const currentPage = Math.max(1, currentPageInput);
  const filters = parseTweetFilters(requestUrl.searchParams);
  const searchRaw = requestUrl.searchParams.get("search") ?? "";

  const supabase = createTweetsSupabase();
  let loadError: string | null = null;
  let rows: TweetRow[] = [];
  let totalCount = 0;

  let structuredDataItems: Array<{ name: string; url: string }> = [];
  let lastUpdateDate = "Unknown";

  if (!supabase) {
    loadError = "Supabase URL or anon key is not configured.";
  } else {
    const [result, structuredItems, latest] = await Promise.all([
      getTweetsPage(supabase, filters, searchRaw, currentPage),
      getStructuredTweetItems(supabase),
      getLatestTweetDate(supabase),
    ]);
    rows = result.rows;
    totalCount = result.totalCount;
    loadError = result.error;
    if (!loadError) {
      structuredDataItems = structuredItems;
      if (latest) {
        lastUpdateDate = new Date(latest).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
  }

  const totalPages = Math.ceil(totalCount / TWEETS_PAGE_SIZE) || 1;

  if (totalCount > 0 && currentPage > totalPages) {
    return { redirectTo: tweetsListUrl(totalPages, filters, searchRaw) };
  }
  if (totalCount === 0 && currentPage > 1) {
    return { redirectTo: tweetsListUrl(1, filters, searchRaw) };
  }

  const headingLabel = tweetHeadingLabel(filters);
  const permalink = new URL(
    requestUrl.pathname + requestUrl.search,
    site ?? requestUrl.origin,
  ).href;

  const hrefBookmarks = tweetsListUrl(
    1,
    flipTweetFilter(filters, "showBookmarks"),
    searchRaw,
  );
  const hrefLikes = tweetsListUrl(
    1,
    flipTweetFilter(filters, "showLikes"),
    searchRaw,
  );
  const hrefRetweets = tweetsListUrl(
    1,
    flipTweetFilter(filters, "showRetweets"),
    searchRaw,
  );

  const hrefPrev =
    currentPage > 1
      ? tweetsListUrl(currentPage - 1, filters, searchRaw)
      : null;
  const hrefNext =
    currentPage < totalPages
      ? tweetsListUrl(currentPage + 1, filters, searchRaw)
      : null;

  const filterNonDefault =
    filters.showBookmarks || filters.showLikes || !filters.showRetweets;

  return {
    view: {
      currentPage,
      rows,
      totalCount,
      totalPages,
      loadError,
      filters,
      searchRaw,
      structuredDataItems,
      lastUpdateDate,
      headingLabel,
      permalink,
      hrefBookmarks,
      hrefLikes,
      hrefRetweets,
      hrefPrev,
      hrefNext,
      filterNonDefault,
    },
  };
}
