const SUPABASE_URL = 'https://jufevdkrsjukjnknkbte.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-rOadKyxnHUxdRl9Sww4Ig_MpcJCRY0';

async function queryPosts(parameters) {
  const url = new URL('/rest/v1/blog_posts', SUPABASE_URL);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
  return response.json();
}

export async function getPublishedPost(slug) {
  const posts = await queryPosts({
    select: 'slug,title,excerpt,content_html,thumbnail_url,published_at,updated_at',
    slug: `eq.${slug}`,
    status: 'eq.published',
    published_at: `lte.${new Date().toISOString()}`,
    limit: '1',
  });
  return posts[0] || null;
}

export async function getPublishedPostUrls() {
  return queryPosts({
    select: 'slug,updated_at',
    status: 'eq.published',
    published_at: `lte.${new Date().toISOString()}`,
    order: 'published_at.desc',
  });
}
