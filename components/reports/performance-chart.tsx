"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";

export function PerformanceChart({
  data,
  currency,
}: {
  data: { date: string; revenue: number; profit: number }[];
  currency: string;
}) {
  return (
    <div className="h-[280px] w-full p-4">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--forest)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--forest)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="date" fontSize={11} tickLine={false} />
          <YAxis axisLine={false} fontSize={11} tickLine={false} width={54} />
          <Tooltip
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            formatter={(value, name) => [formatMoney(Number(value), currency), name === "revenue" ? "Revenue" : "Profit"]}
          />
          <Area dataKey="revenue" fill="url(#revenue-fill)" name="revenue" stroke="var(--forest)" strokeWidth={2} type="monotone" />
          <Area dataKey="profit" fill="transparent" name="profit" stroke="var(--amber)" strokeWidth={2} type="monotone" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
