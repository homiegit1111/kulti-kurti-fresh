import {
  FileText,
  IndianRupee,
  MessageCircle,
  PackageCheck,
  Repeat,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";

const trustItems = [
  { label: `MOQ ${B2B_CONFIG.minimumOrderSets} sets`, icon: PackageCheck },
  { label: `1 set = ${B2B_CONFIG.setSize} pcs`, icon: Repeat },
  { label: `Ratio ${SIZE_RATIO_LABEL}`, icon: IndianRupee },
  { label: "Invoice support", icon: FileText },
  { label: "Razorpay ready", icon: ShieldCheck },
  { label: "WhatsApp support", icon: MessageCircle },
  { label: "All-India dispatch", icon: Truck },
];

export function WholesaleTrustBar({ className = "" }: { className?: string }) {
  return (
    <div className={`border-y border-charcoal/10 bg-white/70 ${className}`}>
      <div className="mx-auto flex max-w-[1400px] gap-3 overflow-x-auto px-4 py-4 sm:px-6 lg:px-12 hide-scrollbar">
        {trustItems.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex min-w-fit items-center gap-2 border border-charcoal/10 bg-warm-white px-4 py-3"
          >
            <Icon className="h-3.5 w-3.5 text-gold-dark" strokeWidth={1.5} />
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-charcoal/60">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
