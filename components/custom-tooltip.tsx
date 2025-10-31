import { format } from "date-fns";

import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import type { TooltipContentProps } from "recharts";

export const CustomTooltip = ({
  active,
  payload,
}: TooltipContentProps<number, string>) => {
  if (!active || !payload || payload.length < 2) return null;

  const date = (payload[0].payload as { date: Date }).date;
  const income = Number(payload[0].value ?? 0);
  const expenses = Number(payload[1].value ?? 0);

  return (
    <div className="rounded-sm bg-white text-black shadow-sm border overflow-hidden">
      <div className="text-sm p-2 px-3 bg-muted text-muted-foreground">
        {format(date, "MMM dd, yyyy")}
      </div>
      <Separator />
      <div className="p-2 px-3 space-y-1">
        <div className="flex items-center justify-between gap-x-4">
          <div className="flex items-center gap-x-2">
            <div className="size-1.5 bg-emerald-500 rounded-full" />
            <p className="text-sm text-slate-600">Income</p>
          </div>
          <p className="text-sm text-right font-medium">
            {formatCurrency(income)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-x-4">
          <div className="flex items-center gap-x-2">
            <div className="size-1.5 bg-rose-500 rounded-full" />
            <p className="text-sm text-slate-600">Expenses</p>
          </div>
          <p className="text-sm text-right font-medium">
            {formatCurrency(expenses * -1)}
          </p>
        </div>
      </div>
    </div>
  );
};
