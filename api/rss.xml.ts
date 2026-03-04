import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const upstream = "https://pqsbhdprvvswzdlkqwju.supabase.co/functions/v1/rss-feed";

  const r = await fetch(upstream, {
    headers: {
      Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
      "User-Agent": "SDA-RSS-Proxy/1.0",
    },
  });

  if (!r.ok) {
    res.status(502).send(`Upstream RSS error: ${r.status}`);
    return;
  }

  const xml = await r.text();
  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=1800");
  res.status(200).send(xml);
}
