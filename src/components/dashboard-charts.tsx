"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

interface MonthlyData {
  month: string;
  collections: number;
  deliveries: number;
}

interface MakeData {
  make: string;
  count: number;
}

const COLORS = [
  "hsl(220, 70%, 55%)",
  "hsl(200, 65%, 50%)",
  "hsl(180, 55%, 45%)",
  "hsl(160, 50%, 45%)",
  "hsl(140, 45%, 45%)",
  "hsl(260, 50%, 55%)",
  "hsl(280, 45%, 50%)",
  "hsl(300, 40%, 50%)",
];

function formatMonth(ym: string) {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function HandoversOverTimeChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(var(--foreground))",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Bar
          dataKey="collections"
          name="Collections"
          fill="hsl(220, 70%, 55%)"
          radius={[3, 3, 0, 0]}
          stackId="a"
        />
        <Bar
          dataKey="deliveries"
          name="Deliveries"
          fill="hsl(160, 55%, 50%)"
          radius={[3, 3, 0, 0]}
          stackId="a"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopMakesChart({ data }: { data: MakeData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          type="category"
          dataKey="make"
          width={80}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(var(--foreground))",
          }}
        />
        <Bar dataKey="count" name="Handovers" radius={[0, 3, 3, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
