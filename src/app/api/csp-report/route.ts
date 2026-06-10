import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Collects Content-Security-Policy violation reports (report-only phase).
 *
 * Browsers POST here when the report-only policy would have blocked something.
 * We log a compact summary so we can tighten the policy before enforcing it.
 * Accepts both legacy `application/csp-report` and Reporting API payloads.
 */
export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as Record<string, unknown>;

    // Legacy format: { "csp-report": { "blocked-uri", "violated-directive", ... } }
    const legacy = (data["csp-report"] as Record<string, unknown>) || null;
    if (legacy) {
      console.warn("[csp-report]", {
        directive: legacy["violated-directive"],
        blocked: legacy["blocked-uri"],
        documentUri: legacy["document-uri"],
      });
    } else if (Array.isArray(data)) {
      // Reporting API format: [{ type, body: { blockedURL, ... } }]
      for (const r of data) {
        const body = (r as { body?: Record<string, unknown> }).body;
        if (body) {
          console.warn("[csp-report]", {
            directive: body["effectiveDirective"] ?? body["violatedDirective"],
            blocked: body["blockedURL"],
            documentUri: body["documentURL"],
          });
        }
      }
    } else {
      console.warn("[csp-report] (unrecognised payload)");
    }
  } catch {
    // Ignore malformed reports — never error on the reporting path.
  }

  // 204: accepted, nothing to return.
  return new NextResponse(null, { status: 204 });
}
