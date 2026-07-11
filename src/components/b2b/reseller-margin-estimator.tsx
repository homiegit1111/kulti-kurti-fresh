"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { formatPrice } from "@/lib/commerce/catalog";

export function ResellerMarginEstimator({
  wholesalePerPiece,
  defaultResalePrice,
}: {
  wholesalePerPiece: number;
  defaultResalePrice?: number;
}) {
  const [resalePrice, setResalePrice] = useState(
    defaultResalePrice ?? Math.round(wholesalePerPiece * 1.45),
  );

  const margin = useMemo(() => {
    const perPiece = Math.max(0, resalePrice - wholesalePerPiece);
    return {
      perPiece,
      perSet: perPiece * B2B_CONFIG.setSize,
      percent:
        resalePrice > 0 ? Math.round((perPiece / resalePrice) * 100) : 0,
    };
  }, [resalePrice, wholesalePerPiece]);

  return (
    <div className="border border-line/20 bg-surface-2 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center border border-line/25 text-content">
          <Calculator className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-accent-red">
            Reseller Margin
          </p>
          <h3 className="text-2xl font-black uppercase leading-none tracking-[-0.04em] text-content">
            Estimate
          </h3>
        </div>
      </div>

      <label className="field-label">Expected resale price per piece</label>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={resalePrice}
        onChange={(event) => setResalePrice(Number(event.target.value) || 0)}
        className="field-luxe"
      />

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <Metric label="Cost / pc" value={formatPrice(wholesalePerPiece)} />
        <Metric label="Margin / pc" value={formatPrice(margin.perPiece)} />
        <Metric label="Margin / set" value={formatPrice(margin.perSet)} />
      </div>
      <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.18em] leading-relaxed text-content/45">
        Estimate only. Final resale price depends on your market. Approx margin:
        {" "}{margin.percent}%.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line/20 px-2 py-3">
      <p className="text-lg font-black tracking-[-0.03em] text-content">{value}</p>
      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-content/45">
        {label}
      </p>
    </div>
  );
}
