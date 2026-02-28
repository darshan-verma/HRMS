import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  compact?: boolean;
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-brand-600",
  iconBg = "bg-brand-50",
  compact = false
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover",
        compact ? "p-3" : "p-5"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("space-y-1", !compact && "space-y-2")}>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className={cn("font-bold text-slate-900", compact ? "text-lg" : "text-2xl")}>{value}</p>
          {change && (
            <p
              className={cn(
                "text-xs font-medium",
                changeType === "positive" && "text-emerald-600",
                changeType === "negative" && "text-rose-600",
                changeType === "neutral" && "text-slate-500"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn(compact ? "rounded-md p-1.5" : "rounded-lg p-2.5", iconBg)}>
          <Icon size={compact ? 16 : 20} className={iconColor} />
        </div>
      </div>
    </div>
  );
}
