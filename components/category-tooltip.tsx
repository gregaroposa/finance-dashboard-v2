import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import type { TooltipContentProps } from "recharts";

export const CategoryTooltip = ({
  active,
  payload,
}: TooltipContentProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;

  const name = (payload[0]?.payload as { name?: string })?.name ?? "";
  const value = Number(payload[0]?.value ?? 0);

  return (
    <div className="rounded-sm bg-white text-black shadow-sm border overflow-hidden">
      <div className="text-sm p-2 px-3 bg-muted text-muted-foreground">
        {name}
      </div>
      <Separator />
      <div className="p-2 px-3 space-y-1">
        <div className="flex items-center justify-between gap-x-4">
          <div className="flex items-center gap-x-2">
            <div className="size-1.5 bg-rose-500 rounded-full" />
            <p className="text-sm text-slate-600">Expenses</p>
          </div>
          <p className="text-sm text-right font-medium">
            {formatCurrency(value * -1)}
          </p>
        </div>
      </div>
    </div>
  );
};
