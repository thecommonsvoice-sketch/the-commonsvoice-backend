/**
 * SEO Notifier — Pings Google & triggers ISR revalidation when articles are published.
 * 
 * This ensures:
 * 1. Google discovers new articles within hours (not days/weeks)
 * 2. The frontend ISR cache is refreshed so the sitemap and pages are up to date
 */

const SITE_URL = process.env.FRONTEND_URL || 'https://thecommonsvoice.com';
const SITEMAP_URL = `${SITE_URL}/articles-sitemap.xml`;

/**
 * Ping Google to recrawl the sitemap.
 * This is a lightweight, fire-and-forget HTTP request.
 */
async function pingGoogle() {
  try {
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    const response = await fetch(pingUrl, { method: 'GET', signal: AbortSignal.timeout(10000) });
    console.log(`[SEO] Google sitemap ping: ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    // Non-critical: don't let ping failures affect article publishing
    console.error('[SEO] Google ping failed (non-critical):', error.message);
    return false;
  }
}

/**
 * Ping Bing/IndexNow to notify about new content.
 */
async function pingBing() {
  try {
    const pingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    const response = await fetch(pingUrl, { method: 'GET', signal: AbortSignal.timeout(10000) });
    console.log(`[SEO] Bing sitemap ping: ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    console.error('[SEO] Bing ping failed (non-critical):', error.message);
    return false;
  }
}

/**
 * Trigger Next.js on-demand ISR revalidation for specific paths.
 * This ensures the frontend sitemap and article pages are regenerated immediately.
 */
async function revalidateFrontend(articleSlug) {
  try {
    // Revalidate the articles sitemap so Google sees the new URL
    const sitemapRes = await fetch(`${SITE_URL}/api/revalidate?path=/articles-sitemap.xml`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    console.log(`[SEO] Sitemap revalidation: ${sitemapRes.status}`);

    // Revalidate the articles listing page
    const listRes = await fetch(`${SITE_URL}/api/revalidate?path=/articles`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    console.log(`[SEO] Articles page revalidation: ${listRes.status}`);

    // Revalidate the homepage 
    const homeRes = await fetch(`${SITE_URL}/api/revalidate?path=/`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    console.log(`[SEO] Homepage revalidation: ${homeRes.status}`);

    // Revalidate the specific article page if slug is provided
    if (articleSlug) {
      const articleRes = await fetch(`${SITE_URL}/api/revalidate?path=/articles/${articleSlug}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });
      console.log(`[SEO] Article page revalidation (/articles/${articleSlug}): ${articleRes.status}`);
    }

    return true;
  } catch (error) {
    console.error('[SEO] Frontend revalidation failed (non-critical):', error.message);
    return false;
  }
}

/**
 * Main entry point: Call this when an article is published.
 * Runs all notifications in parallel (fire-and-forget, non-blocking).
 */
export function notifyArticlePublished(articleSlug) {
  // Run all notifications in parallel without awaiting — don't block the response
  Promise.allSettled([
    pingGoogle(),
    pingBing(),
    revalidateFrontend(articleSlug),
  ]).then((results) => {
    const summary = results.map((r, i) => {
      const names = ['Google', 'Bing', 'ISR Revalidation'];
      return `${names[i]}: ${r.status === 'fulfilled' && r.value ? '✅' : '❌'}`;
    });
    console.log(`[SEO] Publish notifications: ${summary.join(' | ')}`);
  });
}
