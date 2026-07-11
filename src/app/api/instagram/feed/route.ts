import { NextResponse } from "next/server";
import { getInstagramFeed } from "@/lib/instagram/fetch-feed";

export const revalidate = 3600; // 1 hour

export async function GET() {
  try {
    const { items, source } = await getInstagramFeed(8);
    return NextResponse.json(
      { items, source },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    console.error("[api/instagram/feed]", err);
    return NextResponse.json(
      { items: [], source: "error" },
      { status: 500 },
    );
  }
}
