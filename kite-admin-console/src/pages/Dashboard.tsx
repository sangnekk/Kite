import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Users, Bot, Zap, TriangleAlert as AlertTriangle, Activity, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { useAuth } from "@/context/AuthContext"

type AdminPage = "dashboard" | "users" | "apps" | "logs" | "billing" | "revenue"

interface DashboardProps {
  onNavigate: (page: AdminPage) => void
}

interface DashboardStats {
  total_users: number
  total_apps: number
  active_apps: number
  disabled_apps: number
  errors_24h: number
  errors_prev_24h: number
  total_credits: number
  active_subscriptions: number
}

interface UsageTimeSeriesItem {
  date: string
  credits: number
  errors: number
}

interface RecentLogItem {
  id: number
  app_id: string
  app_name: string | null
  message: string | null
  level: string | null
  created_at: string
}

interface DashboardData {
  stats: DashboardStats
  usage_chart: UsageTimeSeriesItem[]
  recent_logs: RecentLogItem[]
}

const chartConfig = {
  credits: { label: "Credits", color: "var(--chart-1)" },
  errors: { label: "Errors", color: "var(--chart-5)" },
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color = "text-foreground",
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  trend?: "up" | "down"
  color?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-medium uppercase tracking-wide">
            {label}
          </CardDescription>
          <Icon className={`size-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold tracking-tight ${color}`}>{value}</div>
        {sub && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {trend === "up" ? (
              <TrendingUp className="size-3 text-destructive" />
            ) : trend === "down" ? (
              <TrendingDown className="size-3 text-green-500" />
            ) : null}
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { apiFetch } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiFetch("/dashboard").then(async (res) => {
      if (res.ok) setData(await res.json())
    }).finally(() => setLoading(false))
  }, [apiFetch])

  const levelColor: Record<string, string> = {
    error: "destructive",
    warn: "secondary",
    info: "outline",
  }

  const levelDot: Record<string, string> = {
    error: "bg-destructive",
    warn: "bg-yellow-500",
    info: "bg-green-500",
  }

  if (loading || !data) {
    return (
      <div className="p-6 flex justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { stats, usage_chart, recent_logs } = data

  const errorTrend = stats.errors_24h > stats.errors_prev_24h ? "up" : stats.errors_24h < stats.errors_prev_24h ? "down" : undefined
  const errorSub = `so với ${stats.errors_prev_24h} hôm qua`

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trung tâm điều khiển</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tổng quan hệ thống Kite — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={Users} label="Tổng người dùng" value={stats.total_users} />
        <StatCard icon={Bot} label="Tổng ứng dụng" value={stats.total_apps} sub={`${stats.disabled_apps} đã vô hiệu hóa`} />
        <StatCard icon={Activity} label="Ứng dụng hoạt động" value={stats.active_apps} />
        <StatCard
          icon={AlertTriangle}
          label="Lỗi (24h)"
          value={stats.errors_24h}
          sub={errorSub}
          trend={errorTrend}
          color={stats.errors_24h > 0 ? "text-destructive" : "text-foreground"}
        />
        <StatCard icon={Zap} label="Tín dụng đã dùng" value={stats.total_credits.toLocaleString()} sub={`${stats.active_subscriptions} đăng ký hoạt động`} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Mức sử dụng theo thời gian</CardTitle>
            <CardDescription>Tín dụng tiêu thụ mỗi ngày (7 ngày gần đây)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <AreaChart data={usage_chart} accessibilityLayer>
                <CartesianGrid vertical={false} className="stroke-border" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="credits"
                  stroke="var(--color-credits)"
                  fill="var(--color-credits)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Tỷ lệ lỗi</CardTitle>
                <CardDescription>Lỗi mỗi ngày (7 ngày gần đây)</CardDescription>
              </div>
              <Button size="sm" variant="destructive" onClick={() => onNavigate("logs")}>
                Xem nhật ký
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart data={usage_chart} accessibilityLayer>
                <CartesianGrid vertical={false} className="stroke-border" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="errors"
                  fill="var(--color-errors)"
                  radius={[3, 3, 0, 0]}
                  className="cursor-pointer"
                  onClick={() => onNavigate("logs")}
                />
              </BarChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground mt-2">Nhấp vào một cột để chuyển đến nhật ký</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="size-2 rounded-full bg-green-500 animate-pulse inline-block" />
                Hoạt động trực tiếp
              </CardTitle>
              <CardDescription>Sự kiện hệ thống gần đây nhất</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate("logs")}>
              Xem tất cả
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recent_logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Không có nhật ký gần đây</p>
            ) : (
              recent_logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onNavigate("logs")}
                >
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${levelDot[log.level ?? ""] ?? "bg-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                      <Badge variant={levelColor[log.level ?? ""] as "destructive" | "secondary" | "outline" ?? "outline"} className="h-4 px-1.5 text-[10px]">
                        {log.level ?? "—"}
                      </Badge>
                      <span className="text-xs font-medium text-primary shrink-0">
                        {log.app_name ?? log.app_id}
                      </span>
                    </div>
                    <p className="text-sm truncate mt-0.5">{log.message ?? "—"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
