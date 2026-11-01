import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Activity, Bot, Coins, TrendingDown, TrendingUp, TriangleAlert, Users, type LucideIcon } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { DateTime, DetailSkeleton, ErrorState } from "@/components/common/Misc"
import { PageHeader } from "@/components/common/PageHeader"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { api } from "@/lib/api"
import { formatCompact, formatDayMonth, formatNumber, percentChange } from "@/lib/format"
import type { DashboardData } from "@/lib/types"
import { cn } from "@/lib/utils"

const chartConfig = {
  credits: { label: "Credits", color: "var(--chart-1)" },
  errors: { label: "Lỗi", color: "var(--chart-5)" },
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  to,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: React.ReactNode
  to?: string
}) {
  const body = (
    <Card className={cn(to && "transition-colors hover:bg-accent/50")}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {label}
          <Icon className="size-4" />
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

/** Errors going up is bad news, so up is red here. */
function ErrorTrend({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous)
  if (change === null) return <span>Tăng so với 24 giờ trước</span>
  if (change === 0) return <span>Không đổi so với 24 giờ trước</span>

  const up = change > 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={cn("inline-flex items-center gap-1", up ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
      <Icon className="size-3" />
      {Math.abs(Math.round(change))}% so với 24 giờ trước
    </span>
  )
}

export function Component() {
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: ({ signal }) => api<DashboardData>("/dashboard", { signal }),
    refetchInterval: 60_000,
  })

  if (dashboard.isPending) return <DetailSkeleton />
  if (dashboard.error) return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />

  const { stats, usage_chart, recent_logs } = dashboard.data
  const chartData = usage_chart.map((d) => ({ ...d, label: formatDayMonth(d.date) }))

  return (
    <>
      <PageHeader title="Tổng quan" description="Tình hình hệ thống, tự cập nhật mỗi phút." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Users} label="Người dùng" value={formatNumber(stats.total_users)} to="/users" />
        <StatCard
          icon={Bot}
          label="Ứng dụng"
          value={formatNumber(stats.total_apps)}
          hint={`${formatNumber(stats.active_apps)} đang bật · ${formatNumber(stats.disabled_apps)} đã tắt`}
          to="/apps"
        />
        <StatCard
          icon={TriangleAlert}
          label="Lỗi 24 giờ qua"
          value={formatNumber(stats.errors_24h)}
          hint={<ErrorTrend current={stats.errors_24h} previous={stats.errors_prev_24h} />}
          to="/logs?level=error"
        />
        <StatCard icon={Coins} label="Tổng credits đã dùng" value={formatCompact(stats.total_credits)} />
        <StatCard
          icon={Activity}
          label="Đăng ký đang hoạt động"
          value={formatNumber(stats.active_subscriptions)}
          to="/billing/subscriptions?status=active"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Credits 7 ngày qua</CardTitle>
            <CardDescription>Theo ngày (UTC)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <AreaChart data={chartData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatCompact(Number(v))} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="credits" type="monotone" stroke="var(--color-credits)" fill="var(--color-credits)" fillOpacity={0.2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lỗi 7 ngày qua</CardTitle>
            <CardDescription>Theo ngày (UTC)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="errors" fill="var(--color-errors)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Nhật ký gần đây</CardTitle>
            <CardDescription>10 dòng mới nhất của mọi bot</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/logs">Xem tất cả</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent_logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có nhật ký nào.</p>
          ) : (
            <ul className="divide-y">
              {recent_logs.map((log) => (
                <li key={log.id} className="flex items-center gap-3 py-2 text-sm">
                  <StatusBadge status={log.level} className="shrink-0" />
                  <Link to={`/apps/${log.app_id}`} className="w-40 shrink-0 truncate font-medium underline-offset-4 hover:underline">
                    {log.app_name ?? log.app_id}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground" title={log.message}>
                    {log.message}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    <DateTime value={log.created_at} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
