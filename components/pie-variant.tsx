import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { LegendPayload } from "recharts";

import { formatPercentage } from "@/lib/utils";
import { CategoryTooltip } from "@/components/category-tooltip";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type Props = {
  data: {
    name: string;
    value: number;
  }[];
};

export const PieVariant = ({ data }: Props) => {
  const total = data.reduce(
    (sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0),
    0
  );
  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="right"
          iconType="circle"
          content={({ payload }: { payload?: ReadonlyArray<LegendPayload> }) => {
            const sorted: ReadonlyArray<LegendPayload> = Array.isArray(payload)
              ? [...payload].sort((a: LegendPayload, b: LegendPayload) => {
                  const av = Number.isFinite((a.payload as { value?: number })?.value)
                    ? Number((a.payload as { value?: number })?.value)
                    : 0;
                  const bv = Number.isFinite((b.payload as { value?: number })?.value)
                    ? Number((b.payload as { value?: number })?.value)
                    : 0;
                  return bv - av;
                })
              : [];
            return (
              <ul className="flex flex-col space-y-2">
                {sorted.map((entry, index: number) => (
                  <li
                    key={`item-${index}`}
                    className="flex items-center space-x-2"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <div className="space-x-1">
                      <span className="text-sm text-muted-foreground">
                        {entry.value}
                      </span>
                      <span className="text-sm">
                        {(() => {
                          const raw = (entry?.payload as { value?: number })?.value ?? 0;
                          const percent = total > 0 ? (raw / total) * 100 : 0;
                          return formatPercentage(percent);
                        })()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            );
          }}
        />
        <Tooltip content={CategoryTooltip} />
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={60}
          paddingAngle={2}
          fill="var(--chart-1)"
          dataKey={"value"}
          labelLine={false}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell_${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};
