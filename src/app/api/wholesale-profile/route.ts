import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createClerkSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { B2B_CONFIG, type BusinessType } from "@/lib/b2b/config";
import { isValidGSTIN, isValidWhatsappPhone } from "@/lib/b2b/validation";
import { wholesaleProfileToBuyer } from "@/lib/server/wholesale-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WholesaleProfile = {
  business_name: string;
  city: string;
  gstin: string | null;
  whatsapp_phone: string;
  business_type: BusinessType;
};

const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status });

function isBusinessType(value: unknown): value is BusinessType {
  return (
    typeof value === "string" &&
    B2B_CONFIG.businessTypes.includes(value as BusinessType)
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return json({ profile: null, signedIn: false });
  if (!isSupabaseConfigured()) return json({ profile: null, configured: false });

  const supabase = createClerkSupabaseClient();
  if (!supabase) return json({ profile: null, configured: false });

  const { data, error } = await supabase
    .from("wholesale_accounts")
    .select("business_name, city, gstin, whatsapp_phone, business_type")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[wholesale-profile GET]", error.message);
    return json({ error: "Could not load wholesale profile." }, 500);
  }

  return json({
    profile: data ?? null,
    buyer: data ? wholesaleProfileToBuyer(data) : null,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, 401);
  if (!isSupabaseConfigured()) return json({ configured: false });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const profile: WholesaleProfile = {
    business_name:
      typeof body.business_name === "string" ? body.business_name.trim() : "",
    city: typeof body.city === "string" ? body.city.trim() : "",
    gstin:
      typeof body.gstin === "string" && body.gstin.trim()
        ? body.gstin.trim().toUpperCase()
        : null,
    whatsapp_phone:
      typeof body.whatsapp_phone === "string"
        ? body.whatsapp_phone.trim()
        : "",
    business_type: isBusinessType(body.business_type)
      ? body.business_type
      : "Other",
  };

  if (!profile.business_name) {
    return json({ error: "Business name is required." }, 400);
  }
  if (!profile.city) return json({ error: "City is required." }, 400);
  if (!isValidWhatsappPhone(profile.whatsapp_phone)) {
    return json({ error: "Enter a valid Indian WhatsApp number." }, 400);
  }
  if (profile.gstin && !isValidGSTIN(profile.gstin)) {
    return json({ error: "Enter a valid GSTIN or leave it blank." }, 400);
  }

  const supabase = createClerkSupabaseClient();
  if (!supabase) return json({ configured: false });

  const { error } = await supabase.from("wholesale_accounts").upsert(
    {
      clerk_user_id: userId,
      ...profile,
    },
    { onConflict: "clerk_user_id" },
  );

  if (error) {
    console.error("[wholesale-profile POST]", error.message);
    return json({ error: "Could not save wholesale profile." }, 500);
  }

  return json({
    ok: true,
    profile,
    buyer: wholesaleProfileToBuyer(profile),
  });
}
