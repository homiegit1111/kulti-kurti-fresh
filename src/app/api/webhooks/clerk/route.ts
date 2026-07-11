import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// svix verification needs the Node runtime + the raw request body.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClerkEmail = { id: string; email_address: string };
type ClerkUserData = {
  id: string;
  email_addresses?: ClerkEmail[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};
type ClerkEvent = {
  type: string;
  data: ClerkUserData;
};

function primaryEmail(data: ClerkUserData): string | null {
  const list = data.email_addresses ?? [];
  const primary =
    list.find((e) => e.id === data.primary_email_address_id) ?? list[0];
  return primary?.email_address?.toLowerCase() ?? null;
}

/**
 * Clerk → app webhook (svix-signed). Provisions a Supabase `profiles` row on
 * sign-up and keeps it in sync, so server-side features have a user record
 * even before the user hits an authed client route. Fail-closed: without
 * CLERK_WEBHOOK_SECRET we reject rather than trust an unverified payload.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Clerk webhook secret not configured." },
      { status: 500 },
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix signature headers." },
      { status: 401 },
    );
  }

  const rawBody = await req.text();

  let event: ClerkEvent;
  try {
    event = new Webhook(secret).verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    // Ack so Clerk doesn't retry forever when Supabase isn't wired up yet.
    return NextResponse.json({ ok: true, skipped: "supabase_not_configured" });
  }

  const data = event.data;

  if (event.type === "user.created" || event.type === "user.updated") {
    const { error } = await supabase.from("profiles").upsert(
      {
        clerk_user_id: data.id,
        email: primaryEmail(data),
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
      },
      { onConflict: "clerk_user_id" },
    );
    if (error) {
      console.error("[clerk-webhook] profile upsert failed:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  } else if (event.type === "user.deleted") {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("clerk_user_id", data.id);
    if (error) {
      console.error("[clerk-webhook] profile delete failed:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
