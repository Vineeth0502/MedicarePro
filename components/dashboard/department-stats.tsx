"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { name: "Emergency", capacity: 85 },
  { name: "Cardiology", capacity: 65 },
  { name: "Pediatrics", capacity: 45 },
  { name: "Neurology", capacity: 30 },
  { name: "Orthopedics", capacity: 55 },
]

export function DepartmentStats() {
  return (
    <Card className="col-span-4 lg:col-span-3">
      <CardHeader>
        <CardTitle>Department Occupancy</CardTitle>
        <CardDescription>Current capacity usage by department (%).</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            capacity: {
              label: "Occupancy",
              color: "hsl(var(--chart-3))",
            },
          }}
          className="h-[200px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={12} width={80} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="capacity" fill="var(--color-capacity)" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
