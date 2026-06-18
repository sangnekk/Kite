import { useState, useEffect, useCallback } from "react"
import { CircleCheck as CheckCircle, Circle as XCircle, Clock, Ban, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/context/AuthContext"

interface SubscriptionItem {
  id: string
  user_id: string
  user_email: string | null
  display_name: string | null
  source: string | null
  status: string | null
  renews_at: string | null
  trial_ends_at: string | null
  ends_at: string | null
  created_at: string
}

interface EntitlementItem {
  id: string
  type: string | null
  app_id: string
  app_name: string | null
  subscription_id: string | null
  plan_id: string | null
  ends_at: string | null
  created_at: string
}

interface PaymentSessionItem {
  id: string
  app_id: string
  app_name: string | null
  provider: string | null
  amount: number | null
  status: string | null
  paid_at: string | null
  created_at: string
}

const subStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  on_trial: "default",
  cancelled: "destructive",
  expired: "secondary",
}

const payStatusIcon: Record<string, React.ElementType> = {
  paid: CheckCircle,
  pending: Clock,
  failed: XCircle,
}

const payStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "outline",
  pending: "secondary",
  failed: "destructive",
}

export function Billing() {
  const { apiFetch } = useAuth()

  const [subs, setSubs] = useState<SubscriptionItem[]>([])
  const [subsLoading, setSubsLoading] = useState(true)
  const [subsTotal, setSubsTotal] = useState(0)
  const [subsPage, setSubsPage] = useState(1)

  const [ents, setEnts] = useState<EntitlementItem[]>([])
  const [entsLoading, setEntsLoading] = useState(true)
  const [entsTotal, setEntsTotal] = useState(0)
  const [entsPage, setEntsPage] = useState(1)

  const [grantAppId, setGrantAppId] = useState("")
  const [grantPlanId, setGrantPlanId] = useState("")
  const [grantDays, setGrantDays] = useState("")
  const [granting, setGranting] = useState(false)
  const [grantError, setGrantError] = useState("")

  const [sessions, setSessions] = useState<PaymentSessionItem[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsTotal, setSessionsTotal] = useState(0)
  const [sessionsPage, setSessionsPage] = useState(1)

  const pageSize = 20

  const fetchSubs = useCallback(async () => {
    setSubsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(subsPage), page_size: String(pageSize) })
      const res = await apiFetch(`/billing/subscriptions?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setSubs(data.items)
      setSubsTotal(data.total)
    } finally {
      setSubsLoading(false)
    }
  }, [apiFetch, subsPage])

  const fetchEnts = useCallback(async () => {
    setEntsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(entsPage), page_size: String(pageSize) })
      const res = await apiFetch(`/billing/entitlements?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setEnts(data.items)
      setEntsTotal(data.total)
    } finally {
      setEntsLoading(false)
    }
  }, [apiFetch, entsPage])

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(sessionsPage), page_size: String(pageSize) })
      const res = await apiFetch(`/billing/payment-sessions?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setSessions(data.items)
      setSessionsTotal(data.total)
    } finally {
      setSessionsLoading(false)
    }
  }, [apiFetch, sessionsPage])

  useEffect(() => { fetchSubs() }, [fetchSubs])
  useEffect(() => { fetchEnts() }, [fetchEnts])
  useEffect(() => { fetchSessions() }, [fetchSessions])

  async function cancelSubscription(id: string) {
    const res = await apiFetch(`/billing/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    })
    if (res.ok) fetchSubs()
  }

  async function removeEntitlement(id: string) {
    const res = await apiFetch(`/billing/entitlements/${id}`, { method: "DELETE" })
    if (res.ok) fetchEnts()
  }

  async function grantEntitlement() {
    if (!grantAppId.trim() || !grantPlanId.trim()) {
      setGrantError("App ID và Plan ID là bắt buộc")
      return
    }
    setGranting(true)
    setGrantError("")
    try {
      const days = parseInt(grantDays, 10)
      const res = await apiFetch(`/billing/entitlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: grantAppId.trim(),
          plan_id: grantPlanId.trim(),
          duration_days: Number.isFinite(days) && days > 0 ? days : null,
        }),
      })
      if (res.ok) {
        setGrantAppId("")
        setGrantPlanId("")
        setGrantDays("")
        fetchEnts()
      } else {
        const data = await res.json().catch(() => null)
        setGrantError(data?.detail ?? "Cấp gói thất bại")
      }
    } finally {
      setGranting(false)
    }
  }

  async function markPaid(id: string) {
    const res = await apiFetch(`/billing/payment-sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    })
    if (res.ok) fetchSessions()
  }

  async function cancelSession(id: string) {
    const res = await apiFetch(`/billing/payment-sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "failed" }),
    })
    if (res.ok) fetchSessions()
  }

  function renderPagination(total: number, page: number, setPage: (fn: (p: number) => number) => void) {
    if (total <= pageSize) return null
    return (
      <div className="flex justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Trước
        </Button>
        <span className="text-sm text-muted-foreground py-1.5">
          Trang {page} / {Math.ceil(total / pageSize)}
        </span>
        <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>
          Sau
        </Button>
      </div>
    )
  }

  function renderLoading() {
    return (
      <TableRow>
        <TableCell colSpan={7} className="text-center py-8">
          <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thanh toán & Đăng ký</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý gói, quyền lợi và xử lý các vấn đề thanh toán</p>
      </div>

      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Đăng ký</TabsTrigger>
          <TabsTrigger value="entitlements">Quyền lợi</TabsTrigger>
          <TabsTrigger value="payments">Phiên thanh toán</TabsTrigger>
        </TabsList>

        {/* Subscriptions */}
        <TabsContent value="subscriptions" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Đăng ký</CardTitle>
              <CardDescription>Gói được gán cho người dùng</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Gói</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Gia hạn vào</TableHead>
                    <TableHead>Nguồn</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subsLoading ? renderLoading() : subs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Không có đăng ký</TableCell>
                    </TableRow>
                  ) : (
                    subs.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium text-sm">{sub.user_email ?? sub.user_id}</TableCell>
                        <TableCell>
                          <Badge variant={sub.display_name ? "default" : "secondary"}>{sub.display_name ?? "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={subStatusVariant[sub.status ?? ""] ?? "secondary"}>{sub.status ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sub.renews_at ? new Date(sub.renews_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{sub.source ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            {sub.status === "active" && (
                              <Button size="xs" variant="destructive" onClick={() => cancelSubscription(sub.id)}>
                                <Ban className="size-3" /> Hủy
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {renderPagination(subsTotal, subsPage, setSubsPage)}
        </TabsContent>

        {/* Entitlements */}
        <TabsContent value="entitlements" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cấp gói thủ công</CardTitle>
              <CardDescription>
                Tạo quyền lợi (entitlement) cho một ứng dụng. Để trống số ngày = vĩnh viễn.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">App ID</label>
                <Input
                  className="w-64"
                  placeholder="ID ứng dụng"
                  value={grantAppId}
                  onChange={(e) => setGrantAppId(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Plan ID</label>
                <Input
                  className="w-40"
                  placeholder="vd: premium"
                  value={grantPlanId}
                  onChange={(e) => setGrantPlanId(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Số ngày</label>
                <Input
                  className="w-28"
                  type="number"
                  placeholder="vĩnh viễn"
                  value={grantDays}
                  onChange={(e) => setGrantDays(e.target.value)}
                />
              </div>
              <Button onClick={grantEntitlement} disabled={granting}>
                {granting ? "Đang cấp..." : "Cấp gói"}
              </Button>
              {grantError && (
                <p className="w-full text-sm text-destructive">{grantError}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ứng dụng</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Mã gói</TableHead>
                    <TableHead>Hết hạn vào</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entsLoading ? renderLoading() : ents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Không có quyền lợi</TableCell>
                    </TableRow>
                  ) : (
                    ents.map((ent) => (
                      <TableRow key={ent.id}>
                        <TableCell className="font-medium text-sm">{ent.app_name ?? ent.app_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ent.type ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ent.plan_id ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ent.ends_at ? new Date(ent.ends_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ent.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button size="xs" variant="destructive" onClick={() => removeEntitlement(ent.id)}>Gỡ</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {renderPagination(entsTotal, entsPage, setEntsPage)}
        </TabsContent>

        {/* Payment Sessions */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Phiên thanh toán</CardTitle>
              <CardDescription>Xử lý lỗi webhook thủ công</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ứng dụng</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Nhà cung cấp</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsLoading ? renderLoading() : sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Không có phiên thanh toán</TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => {
                      const StatusIcon = payStatusIcon[session.status ?? ""] ?? Clock
                      return (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium text-sm">{session.app_name ?? session.app_id}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {session.amount != null ? `${session.amount.toLocaleString()}đ` : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <StatusIcon
                                className={`size-3.5 ${
                                  session.status === "paid"
                                    ? "text-green-500"
                                    : session.status === "pending"
                                    ? "text-yellow-500"
                                    : "text-destructive"
                                }`}
                              />
                              <Badge variant={payStatusVariant[session.status ?? ""] ?? "secondary"}>{session.status ?? "—"}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{session.provider ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              {session.status !== "paid" && (
                                <Button size="xs" variant="outline" onClick={() => markPaid(session.id)}>
                                  <CheckCircle className="size-3" /> Đánh dấu đã thanh toán
                                </Button>
                              )}
                              {session.status === "pending" && (
                                <Button size="xs" variant="destructive" onClick={() => cancelSession(session.id)}>
                                  <XCircle className="size-3" /> Hủy
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {renderPagination(sessionsTotal, sessionsPage, setSessionsPage)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
