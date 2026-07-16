// Vercel Edge Function — same-origin proxy for the Arthara IDX movers endpoint
// (IHSG leaders/laggards with index-point contribution). Mirrors api/heatmap.js:
// the scoped token lives ONLY in the server environment; the page calls this
// route and we add the token header upstream.
//
// Env vars (Project → Settings → Environment Variables):
//   IDX_MOVERS_API_BASE_URL / HEATMAP_API_BASE_URL = https://stock.kangritel.com
//   IDX_MOVERS_TOKEN / HEATMAP_TOKEN / HEATMAP_API_TOKEN = <scoped token>
//   (the movers endpoint accepts the heatmap token upstream, so an existing
//    heatmap deployment needs zero new env vars)

export const config = { runtime: "edge" };

export default async function handler(request) {
  const base = process.env.IDX_MOVERS_API_BASE_URL || process.env.HEATMAP_API_BASE_URL;
  const token =
    process.env.IDX_MOVERS_TOKEN || process.env.HEATMAP_TOKEN || process.env.HEATMAP_API_TOKEN;

  if (!base || !token) {
    return new Response(JSON.stringify({ error: "idx-movers API not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // Forward only the params the upstream understands, validated shallowly so
  // this proxy can't be used to smuggle arbitrary query strings upstream.
  const inUrl = new URL(request.url);
  const qs = new URLSearchParams();
  for (const key of ["from", "to"]) {
    const v = inUrl.searchParams.get(key);
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) qs.set(key, v);
  }
  const limit = inUrl.searchParams.get("limit");
  if (limit && /^\d{1,2}$/.test(limit)) qs.set("limit", limit);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 8000);
  try {
    const res = await fetch(`${base}/api/idx-movers${suffix}`, {
      headers: { "X-Internal-Token": token },
      signal: controller.signal,
    });
    if (!res.ok) {
      const isAuth = res.status === 401;
      return new Response(
        JSON.stringify({ error: isAuth ? "idx-movers upstream error" : `idx-movers upstream error (${res.status})` }),
        { status: isAuth ? 502 : res.status, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(await res.text(), {
      status: 200,
      headers: {
        "content-type": "application/json",
        // EOD data + 5-min upstream cache: mirror the heatmap proxy caching.
        "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "idx-movers upstream unreachable" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}
