import { NextResponse } from "next/server";

/**
 * Proxy real Instagram post media (no visitor login).
 * GET /api/instagram/media/{shortcode} → streams the public post image from IG.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  // Try post + reel media endpoints
  const candidates = [
    `https://www.instagram.com/p/${code}/media/?size=l`,
    `https://www.instagram.com/reel/${code}/media/?size=l`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        // cache on edge/server for a day
        next: { revalidate: 86400 },
      });

      if (!res.ok) continue;
      const type = res.headers.get("content-type") || "";
      if (!type.includes("image") && !type.includes("octet-stream")) continue;

      const buf = await res.arrayBuffer();
      if (buf.byteLength < 2000) continue;

      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": type.includes("image") ? type : "image/jpeg",
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      /* try next */
    }
  }

  // Fallback: local cache if we have it
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const local = join(
      process.cwd(),
      "public",
      "images",
      "instagram",
      `${code}.jpg`,
    );
    const buf = await readFile(local);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, s-maxage=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
}
