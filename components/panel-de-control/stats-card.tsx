import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card
      className="relative overflow-hidden rounded-2xl border border-border/60
                 bg-gradient-to-br from-background to-muted/30
                 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* Glow decorativo */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide">{title}</CardTitle>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl 
                     bg-primary/10 text-primary shadow-inner"
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>

        {description && <p className="text-xs text-muted-foreground">{description}</p>}

        {trend && (
          <p
            className={cn(
              "mt-1 text-xs font-medium flex items-center gap-1",
              trend.isPositive ? "text-green-600" : "text-red-600",
            )}
          >
            {trend.isPositive ? "▲" : "▼"} {trend.value}% vs ayer
          </p>
        )}
      </CardContent>
    </Card>
  )
}
