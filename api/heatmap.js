// Vercel Edge Function (this is a static site, not Next.js — Vercel serves any
// file in /api as a function, reachable at /api/heatmap).
//
// Server-side proxy to the Arthara market-heatmap endpoint. The internal token
// lives ONLY in the server environment and is never exposed to the browser.
// The page calls this same-origin route, which adds the token header upstream.
//
// Required env vars (Project → Settings → Environment Variables):
//   HEATMAP_API_BASE_URL = https://stock.kangritel.com
//   HEATMAP_API_TOKEN    = <internal token>   (never NEXT_PUBLIC_*)

export const config = { runtime: "edge" };

export default async function handler() {
  const base = process.env.HEATMAP_API_BASE_URL;
  const token = process.env.HEATMAP_API_TOKEN;

  if (!base || !token) {
    return new Response(JSON.stringify({ error: "heatmap API not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // Abort if upstream stalls, so the client isn't left hanging on the platform timeout.
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 8000);
  try {
    const res = await fetch(`${base}/api/heatmap`, {
      headers: { "X-Internal-Token": token },
      signal: controller.signal,
    });
    if (!res.ok) {
      // Don't leak upstream auth status to the client: a 401 (bad/expired
      // token) is remapped to 502 with a generic body that omits the status.
      const isAuth = res.status === 401;
      return new Response(
        JSON.stringify({ error: isAuth ? "heatmap upstream error" : `heatmap upstream error (${res.status})` }),
        { status: isAuth ? 502 : res.status, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(await res.text(), {
      status: 200,
      headers: {
        "content-type": "application/json",
        // Mirror the upstream ~5-min cache so we don't hammer the backend.
        "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "heatmap upstream unreachable" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}
