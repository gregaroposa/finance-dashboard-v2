import {
  RadialBar,
  RadialBarChart,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { formatCurrency } from "@/lib/utils";

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

export const RadialVariant = ({ data }: Props) => {
  const total = data.reduce(
    (sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0),
    0
  );
  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadialBarChart
        cx="30%"
        cy="30%"
        barSize={10}
        innerRadius="90%"
        outerRadius="40%"
        data={data.map((item, index) => ({
          ...item,
          fill: COLORS[index % COLORS.length],
        }))}
      >
        <RadialBar
          label={{
            position: "insideStart",
            fill: "#fff",
            fontSize: "12px",
          }}
          background
          dataKey="value"
        />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="right"
          iconType="circle"
          content={({ payload }: any) => {
            const sorted = Array.isArray(payload)
              ? [...payload].sort((a: any, b: any) => {
                  const av = Number.isFinite(a?.payload?.value)
                    ? a.payload.value
                    : 0;
                  const bv = Number.isFinite(b?.payload?.value)
                    ? b.payload.value
                    : 0;
                  return bv - av;
                })
              : [];
            return (
              <ul className="flex flex-col space-y-2">
                {sorted.map((entry: any, index: number) => (
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
                          const raw = entry?.payload?.value ?? 0;
                          return formatCurrency(raw);
                        })()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            );
          }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
};
