// Vercel Edge Function — mints the capability ticket for the live IDX movers
// stream. The board itself is PUSHED: the page opens Server-Sent Events
// straight on the Arthara API (GET /api/idx-movers/stream?ticket=…), so no
// function here stays open per viewer and nothing polls.
//
// The ticket is the Arthara capability-ticket format:
//   base64url(JSON {act, exp}) + "." + base64url(HMAC-SHA256(key, payloadB64))
// signed with the scoped movers/heatmap token this project already holds for
// api/idx-movers.js. The token never reaches the browser; the ticket opens
// only the movers stream (act "idx_movers_stream") and only for 60 seconds —
// the server checks it once at connect, and the page re-mints on reconnect.

export const config = { runtime: "edge" };

const TICKET_TTL_SECONDS = 60;

function b64url(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function mintTicket(token, nowSeconds) {
  const payload = b64url(
    new TextEncoder().encode(JSON.stringify({ act: "idx_movers_stream", exp: nowSeconds + TICKET_TTL_SECONDS })),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return payload + "." + b64url(mac);
}

export default async function handler() {
  const base = process.env.IDX_MOVERS_API_BASE_URL || process.env.HEATMAP_API_BASE_URL;
  const token =
    process.env.IDX_MOVERS_TOKEN || process.env.HEATMAP_TOKEN || process.env.HEATMAP_API_TOKEN;

  if (!base || !token) {
    return new Response(JSON.stringify({ error: "idx-movers stream not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const ticket = await mintTicket(token, Math.floor(Date.now() / 1000));
  const url = `${base.replace(/\/+$/, "")}/api/idx-movers/stream?ticket=${encodeURIComponent(ticket)}`;
  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
