import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ErrorState } from "@/components/common/Misc"
import { PageHeader } from "@/components/common/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { formatCompact, formatMoney, formatNumber, percentChange } from "@/lib/format"
import type { RevenuePeriod, RevenuePoint, RevenueSummary, SubscriptionStats } from "@/lib/types"
import { cn } from "@/lib/utils"

const PERIODS: { value: RevenuePeriod; label: string; current: string; previous: string; chart: string }[] = [
  { value: "day", label: "Ngày", current: "Hôm nay", previous: "hôm qua", chart: "24 giờ qua" },
  { value: "week", label: "Tuần", current: "Tuần này", previous: "tuần trước", chart: "7 ngày qua" },
  { value: "month", label: "Tháng", current: "Tháng này", previous: "tháng trước", chart: "30 ngày qua" },
]

const chartConfig = { total: { label: "Doanh thu", color: "var(--chart-1)" } }

function Change({ current, previous, label }: { current: number; previous: number; label: string }) {
  const change = percentChange(current, previous)
  if (change === null) return <span className="text-muted-foreground">Mới so với {label}</span>
  if (change === 0) return <span className="text-muted-foreground">Không đổi so với {label}</span>
  return (
    <span className={change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
      {change > 0 ? "+" : "−"}
      {Math.abs(Math.round(change))}% so với {label}
    </span>
  )
}

function bucketLabel(iso: string, period: RevenuePeriod): string {
  const d = new Date(iso)
  return period === "day"
    ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(d)
    : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(d)
}

export function Component() {
  const [params, setParams] = useSearchParams()
  const requested = params.get("period")
  const period = PERIODS.find((p) => p.value === requested) ?? PERIODS[2]

  const summary = useQuery({
    queryKey: ["revenue", "summary", period.value],
    queryFn: ({ signal }) => api<RevenueSummary>("/revenue/summary", { params: { period: period.value }, signal }),
  })
  const chart = useQuery({
    queryKey: ["revenue", "chart", period.value],
    queryFn: ({ signal }) => api<RevenuePoint[]>("/revenue/chart", { params: { period: period.value }, signal }),
  })
  const subs = useQuery({
    queryKey: ["revenue", "subscriptions"],
    queryFn: ({ signal }) => api<SubscriptionStats>("/revenue/subscriptions", { signal }),
  })

  const data = (chart.data ?? []).map((p) => ({ ...p, label: bucketLabel(p.date, period.value) }))

  return (
    <>
      <PageHeader
        title="Doanh thu"
        description="Tính trên các giao dịch đã thanh toán (giờ UTC)."
        actions={
          <Tabs value={period.value} onValueChange={(v) => setParams({ period: v }, { replace: true })}>
            <TabsList>
              {PERIODS.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {summary.error ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Doanh thu · {period.current.toLowerCase()}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {summary.data ? formatMoney(summary.data.total) : <Skeleton className="h-8 w-40" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              {summary.data && <Change current={summary.data.total} previous={summary.data.prev_total} label={period.previous} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Số giao dịch · {period.current.toLowerCase()}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {summary.data ? formatNumber(summary.data.count) : <Skeleton className="h-8 w-20" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              {summary.data && <Change current={summary.data.count} previous={summary.data.prev_count} label={period.previous} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Đăng ký</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {subs.data ? formatNumber(subs.data.total) : <Skeleton className="h-8 w-20" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {subs.data && (
                <>
                  <span>{formatNumber(subs.data.active)} đang hoạt động</span>
                  <span>{formatNumber(subs.data.trial)} dùng thử</span>
                  <span>{formatNumber(subs.data.cancelled)} đã hủy</span>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Doanh thu · {period.chart}</CardTitle>
        </CardHeader>
        <CardContent>
          {chart.error ? (
            <ErrorState error={chart.error} onRetry={() => void chart.refetch()} />
          ) : chart.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : data.length === 0 ? (
            <p className={cn("py-16 text-center text-sm text-muted-foreground")}>Chưa có giao dịch nào trong khoảng này.</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={data} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => formatCompact(Number(v))} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value))} />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </>
  )
}
