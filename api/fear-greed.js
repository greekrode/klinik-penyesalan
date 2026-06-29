// Vercel Edge Function (this is a static site, not Next.js — Vercel serves any
// file in /api as a function, reachable at /api/fear-greed).
//
// Server-side proxy to the backend Fear & Greed endpoint. The internal token
// lives ONLY in the server environment and is never exposed to the browser.
// The page calls this same-origin route, which adds the token header upstream.
//
// Required env vars (Project → Settings → Environment Variables):
//   ALPHAFLOW_API_BASE = https://stock.klinikpenyesalan.com
//   FEAR_GREED_TOKEN   = <64-char internal token>   (never NEXT_PUBLIC_*)

export const config = { runtime: "edge" };

export default async function handler() {
  const base = process.env.ALPHAFLOW_API_BASE;
  const token = process.env.FEAR_GREED_TOKEN;

  if (!base || !token) {
    return new Response(JSON.stringify({ error: "proxy not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const upstream = await fetch(`${base}/api/fear-greed`, {
      headers: { "X-Internal-Token": token },
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type": "application/json",
        // Cached at the edge: the index changes at most once per trading day.
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "upstream unreachable" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
