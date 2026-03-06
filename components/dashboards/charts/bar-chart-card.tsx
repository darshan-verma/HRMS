"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHART_COLORS = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#6366f1"];

type BarChartCardProps = {
  title: string;
  data: { name: string; value: number; [key: string]: string | number }[];
  dataKey?: string;
  valueFormatter?: (n: number) => string;
  color?: string;
  colors?: string[];
};

export function BarChartCard({
  title,
  data,
  dataKey = "value",
  valueFormatter = (n) => String(n),
  color,
  colors = CHART_COLORS
}: BarChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={valueFormatter}
              />
              <Tooltip
                formatter={(v: number | undefined) => [v != null ? valueFormatter(v) : "", ""]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                cursor={{ fill: "rgba(14, 165, 233, 0.06)" }}
              />
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((_, i) => (
                  <Cell key={i} fill={color ?? colors[i % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
