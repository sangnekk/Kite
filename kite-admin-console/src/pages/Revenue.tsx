import { useState, useEffect, useMemo } from "react"
import { TrendingUp, TrendingDown, DollarSign, Receipt, Users, Calculator } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import { useAuth } from "@/context/AuthContext"

type Period = "day" | "week" | "month"

interface Summary {
  total: number
  count: number
  prev_total: number
  prev_count: number
}

interface ChartPoint {
  date: string
  total: number
  count: number
}

interface SubStats {
  active: number
  cancelled: number
  trial: number
  total: number
}

const chartConfig = {
  total: { label: "Revenue", color: "var(--chart-1)" },
}

export function Revenue() {
  const { apiFetch } = useAuth()
  const [period, setPeriod] = useState<Period>("month")
  const [summary, setSummary] = useState<Summary | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [subStats, setSubStats] = useState<SubStats | null>(null)
  const [operatingCost, setOperatingCost] = useState("")
  const [taxPercent, setTaxPercent] = useState("")

  useEffect(() => {
    async function load() {
      const [sumRes, chartRes, subRes] = await Promise.all([
        apiFetch(`/revenue/summary?period=${period}`),
        apiFetch(`/revenue/chart?period=${period}`),
        apiFetch("/revenue/subscriptions"),
      ])
      if (sumRes.ok) setSummary(await sumRes.json())
      if (chartRes.ok) setChartData(await chartRes.json())
      if (subRes.ok) setSubStats(await subRes.json())
    }
    load()
  }, [period, apiFetch])

  const trendPercent = useMemo(() => {
    if (!summary || summary.prev_total === 0) return null
    return Math.round(((summary.total - summary.prev_total) / summary.prev_total) * 100)
  }, [summary])

  const netIncome = useMemo(() => {
    if (!summary) return null
    const cost = parseFloat(operatingCost) || 0
    const tax = parseFloat(taxPercent) || 0
    const afterTax = summary.total - (summary.total * tax / 100)
    return afterTax - cost
  }, [summary, operatingCost, taxPercent])

  const hasDeductions = operatingCost !== "" || taxPercent !== ""

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Income overview and calculation</p>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Total Revenue</CardDescription>
              <DollarSign className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {summary ? `$${(summary.total / 100).toLocaleString()}` : "—"}
            </div>
            {trendPercent !== null && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${trendPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                {trendPercent >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {trendPercent >= 0 ? "+" : ""}{trendPercent}% vs previous
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Transactions</CardDescription>
              <Receipt className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{summary?.count ?? "—"}</div>
            {summary && summary.prev_count > 0 && (
              <p className="text-xs mt-1 text-muted-foreground">
                {summary.prev_count} previous period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">Active Subs</CardDescription>
              <Users className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{subStats?.active ?? "—"}</div>
            <p className="text-xs mt-1 text-muted-foreground">
              {subStats ? `${subStats.trial} trial · ${subStats.cancelled} cancelled` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                {hasDeductions ? "Net Income" : "Gross Income"}
              </CardDescription>
              <Calculator className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {summary ? `$${((hasDeductions ? (netIncome ?? 0) : summary.total) / 100).toLocaleString()}` : "—"}
            </div>
            {hasDeductions && summary && (
              <p className="text-xs mt-1 text-muted-foreground">
                After operating costs & tax
              </p>
            )}
            {!hasDeductions && (
              <p className="text-xs mt-1 text-muted-foreground">
                Before operating costs & tax
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revenue Over Time</CardTitle>
          <CardDescription>Paid transactions grouped by {period === "day" ? "hour" : "day"}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-75 w-full">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return period === "day"
                    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : d.toLocaleDateString([], { month: "short", day: "numeric" })
                }}
                className="text-xs"
              />
              <YAxis tickFormatter={(v) => `$${v / 100}`} className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Income Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Income Calculator</CardTitle>
          <CardDescription>Enter operating costs and tax rate to calculate net income</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="operating-cost">Operating Cost ($)</Label>
              <Input
                id="operating-cost"
                type="number"
                min="0"
                placeholder="0"
                value={operatingCost}
                onChange={(e) => setOperatingCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-percent">Tax Rate (%)</Label>
              <Input
                id="tax-percent"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
              />
            </div>
          </div>
          {hasDeductions && summary && (
            <div className="mt-4 p-4 rounded-md bg-muted/50 max-w-md space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Revenue</span>
                <span className="font-mono">${(summary.total / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxPercent || 0}%)</span>
                <span className="font-mono text-red-600">
                  -${((summary.total * (parseFloat(taxPercent) || 0) / 100) / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operating Cost</span>
                <span className="font-mono text-red-600">
                  -${(parseFloat(operatingCost) || 0).toLocaleString()}
                </span>
              </div>
              <div className="border-t pt-1 flex justify-between font-medium">
                <span>Net Income</span>
                <span className="font-mono">${((netIncome ?? 0) / 100).toLocaleString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
