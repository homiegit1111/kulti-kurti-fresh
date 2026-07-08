import { auth } from "@clerk/nextjs/server";
import { isAuthEnabled } from "@/lib/auth/config";
import type { CommerceBuyer } from "@/lib/commerce";
import { withBuyerIdentity } from "@/lib/commerce/buyer-identity";
import {
  createClerkSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export type WholesaleProfileRow = {
  business_name: string;
  city: string;
  gstin: string | null;
  whatsapp_phone: string;
  business_type: string;
};

function optionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function wholesaleProfileToBuyer(
  profile: WholesaleProfileRow,
): CommerceBuyer {
  return withBuyerIdentity({
    businessName: profile.business_name,
    businessType: profile.business_type,
    city: profile.city,
    phone: profile.whatsapp_phone,
    gstin: profile.gstin ?? "",
    accountSource: "wholesale_profile",
  });
}

export function mergeCheckoutBodyWithWholesaleBuyer(
  body: Record<string, unknown>,
  profileBuyer: CommerceBuyer | null,
): Record<string, unknown> {
  if (!profileBuyer) return body;

  return {
    ...body,
    businessName: hasValue(body.businessName)
      ? body.businessName
      : profileBuyer.businessName,
    businessType: hasValue(body.businessType)
      ? body.businessType
      : profileBuyer.businessType,
    city: hasValue(body.city) ? body.city : profileBuyer.city,
    whatsappPhone: hasValue(body.whatsappPhone)
      ? body.whatsappPhone
      : profileBuyer.phone,
    gstin: hasValue(body.gstin) ? body.gstin : profileBuyer.gstin,
    buyerReference: hasValue(body.buyerReference)
      ? body.buyerReference
      : profileBuyer.buyerReference,
    accountSource: "wholesale_profile",
  };
}

export async function loadCurrentWholesaleBuyer(): Promise<CommerceBuyer | null> {
  if (!isAuthEnabled || !isSupabaseConfigured()) return null;

  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch {
    return null;
  }

  if (!userId) return null;

  const supabase = createClerkSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("wholesale_accounts")
    .select("business_name, city, gstin, whatsapp_phone, business_type")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[wholesale-profile mapping]", error.message);
    return null;
  }

  if (!data) return null;

  return wholesaleProfileToBuyer({
    business_name: optionalString(data.business_name),
    city: optionalString(data.city),
    gstin: data.gstin === null ? null : optionalString(data.gstin),
    whatsapp_phone: optionalString(data.whatsapp_phone),
    business_type: optionalString(data.business_type) || "Other",
  });
}