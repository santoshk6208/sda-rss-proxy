import type { VercelRequest, VercelResponse } from "@vercel/node";
import { XMLParser } from "fast-xml-parser";

function arr<T>(x: T | T[] | undefined): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const upstream = "https://pqsbhdprvvswzdlkqwju.supabase.co/functions/v1/rss-feed";

    const r = await fetch(upstream, {
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
        "User-Agent": "SDA-RSS-Proxy/1.0",
      },
    });

    if (!r.ok) {
      res.status(502).json({ ok: false, error: `Upstream RSS error: ${r.status}` });
      return;
    }

    const xml = await r.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      // Important to keep CDATA / embedded HTML
      cdataPropName: "__cdata",
    });

    const data = parser.parse(xml);

    const channel = data?.rss?.channel;
    const items = arr(channel?.item).map((it: any) => {
      // Handle CDATA from <content:encoded> and <description>
      const contentEncoded =
        it["content:encoded"]?.__cdata ?? it["content:encoded"] ?? "";
      const description = it.description?.__cdata ?? it.description ?? "";

      return {
        title: it.title ?? "",
        link: it.link ?? "",
        guid: (typeof it.guid === "object" ? it.guid?.["#text"] : it.guid) ?? "",
        pubDate: it.pubDate ?? "",
        author: it["dc:creator"] ?? it.author ?? "",
        categories: arr(it.category).map((c: any) => (typeof c === "string" ? c : c?.["#text"] ?? "")),
        description,          // usually excerpt
        contentEncoded,       // full post content if your RSS includes it
      };
    });

    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=1800");
    res.status(200).json({
      ok: true,
      channel: {
        title: channel?.title ?? "",
        link: channel?.link ?? "",
        description: channel?.description ?? "",
      },
      items,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
}
