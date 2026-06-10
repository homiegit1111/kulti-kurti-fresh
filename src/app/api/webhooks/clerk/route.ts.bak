import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ensureShopifyCustomer } from "@/lib/server/shopify-admin";

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No webhook secret configured" }, { status: 500 });
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  type ClerkEmailAddress = { id: string; email_address: string };
  type ClerkWebhookEvent = {
    type: string;
    data: {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      primary_email_address_id?: string | null;
      email_addresses?: ClerkEmailAddress[];
    };
  };

  let evt: ClerkWebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("[clerk-webhook] Error verifying webhook:", err);
    return NextResponse.json({ error: "Error occurred verifying webhook" }, { status: 400 });
  }

  // Handle the event
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const primaryEmail = email_addresses?.find((e) => e.id === evt.data.primary_email_address_id)?.email_address || email_addresses?.[0]?.email_address;

    if (primaryEmail) {
      try {
        await ensureShopifyCustomer({
          email: primaryEmail,
          supabaseUserId: id, // Mapping Clerk ID to the legacy supabaseUserId field in Shopify
          firstName: first_name || "",
          lastName: last_name || "",
        });
        console.log(`[clerk-webhook] Synced user ${id} to Shopify successfully.`);
      } catch (err) {
        console.error(`[clerk-webhook] Failed to sync user ${id} to Shopify:`, err);
      }
    }
  }

  return NextResponse.json({ message: "Success" }, { status: 200 });
}
