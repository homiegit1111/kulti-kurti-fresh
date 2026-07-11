import { B2B_CONFIG } from "@/lib/b2b/config";
import type { WholesaleTotals } from "@/lib/b2b/pricing";

export function MoqProgress({
  totals,
  tone = "light",
}: {
  totals: WholesaleTotals;
  tone?: "light" | "dark";
}) {
  const remainingSets = Math.max(
    0,
    B2B_CONFIG.minimumOrderSets - totals.totalSets,
  );
  const progress = Math.min(
    100,
    Math.round((totals.totalSets / B2B_CONFIG.minimumOrderSets) * 100),
  );
  const dark = tone === "dark";
  const track = dark ? "bg-[#f1eee5]/15" : "bg-[#171814]/15";
  const copy = dark ? "text-[#f1eee5]/55" : "text-[#171814]/55";
  const label = dark ? "text-[#f1eee5]/45" : "text-[#171814]/45";
  const fill = dark ? "bg-[#d8ff4f]" : "bg-[#121310]";

  return (
    <div>
      <div className={`mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.2em] ${label}`}>
        <span>MOQ {B2B_CONFIG.minimumOrderSets} sets</span>
        <span>{progress}%</span>
      </div>
      <div className={`h-1.5 ${track}`}>
        <div className={`h-full ${fill} transition-all`} style={{ width: `${progress}%` }} />
      </div>
      <p className={`mt-3 text-xs leading-relaxed ${copy}`}>
        {remainingSets > 0
          ? `Add ${remainingSets} more ${remainingSets === 1 ? "set" : "sets"} to place a wholesale order.`
          : "Minimum order reached — ready to place your wholesale order."}
      </p>
    </div>
  );
}
