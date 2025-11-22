"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { time: "08:00", visitors: 12, admitted: 4 },
  { time: "09:00", visitors: 25, admitted: 8 },
  { time: "10:00", visitors: 45, admitted: 12 },
  { time: "11:00", visitors: 30, admitted: 15 },
  { time: "12:00", visitors: 20, admitted: 10 },
  { time: "13:00", visitors: 35, admitted: 14 },
  { time: "14:00", visitors: 50, admitted: 18 },
  { time: "15:00", visitors: 40, admitted: 16 },
  { time: "16:00", visitors: 25, admitted: 8 },
  { time: "17:00", visitors: 15, admitted: 5 },
]

export function PatientActivityChart() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Patient Activity</CardTitle>
        <CardDescription>Real-time overview of patient visits and admissions today.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ChartContainer
          config={{
            visitors: {
              label: "Visitors",
              color: "hsl(var(--chart-1))",
            },
            admitted: {
              label: "Admitted",
              color: "hsl(var(--chart-2))",
            },
          }}
          className="h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-visitors)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-visitors)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAdmitted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-admitted)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-admitted)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="var(--color-visitors)"
                fillOpacity={1}
                fill="url(#colorVisitors)"
              />
              <Area
                type="monotone"
                dataKey="admitted"
                stroke="var(--color-admitted)"
                fillOpacity={1}
                fill="url(#colorAdmitted)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
