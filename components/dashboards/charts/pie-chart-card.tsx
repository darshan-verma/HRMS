"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PIE_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

type PieChartCardProps = {
  title: string;
  data: { name: string; value: number }[];
  colors?: string[];
  valueFormatter?: (n: number) => string;
};

export function PieChartCard({
  title,
  data,
  colors = PIE_COLORS,
  valueFormatter = (n) => String(n)
}: PieChartCardProps) {
  const filtered = data.filter((d) => Number(d.value) > 0);
  if (filtered.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">No data</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filtered}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {filtered.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number | undefined) => (v != null ? valueFormatter(v) : "")} />
              <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
