import { useState, useEffect, useCallback } from "react"
import { Search, LogOut, ChevronRight, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/context/AuthContext"

interface UserListItem {
  id: string
  email: string
  display_name: string
  discord_username: string
  discord_avatar: string | null
  plan: string
  apps_count: number
  created_at: string
}

interface AppInfo {
  id: string
  name: string
  enabled: boolean
  created_at: string
}

interface SubscriptionInfo {
  id: string
  status: string | null
  display_name: string | null
  renews_at: string | null
  ends_at: string | null
}

interface UserDetail extends UserListItem {
  apps: AppInfo[]
  subscription: SubscriptionInfo | null
  updated_at: string
}

export function UserManagement() {
  const { apiFetch } = useAuth()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const pageSize = 20

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (search) params.set("search", search)
      const res = await apiFetch(`/users?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setUsers(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [apiFetch, search, page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setSelectedId(id)
    try {
      const res = await apiFetch(`/users/${id}`)
      if (!res.ok) return
      setDetail(await res.json())
    } finally {
      setDetailLoading(false)
    }
  }, [apiFetch])

  async function handleForceLogout(userId: string) {
    const res = await apiFetch(`/users/${userId}/force-logout`, { method: "POST" })
    if (res.ok && detail?.id === userId) {
      setDetail((prev) => prev ? { ...prev } : null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý người dùng</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý người dùng, gói và phiên đăng nhập</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo email hoặc tên đăng nhập..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Discord</TableHead>
                <TableHead>Gói</TableHead>
                <TableHead className="text-right">Ứng dụng</TableHead>
                <TableHead>Ngày tham gia</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Không tìm thấy người dùng nào
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => fetchDetail(user.id)}
                  >
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.discord_username}</TableCell>
                    <TableCell>
                      <Badge variant={user.plan !== "free" ? "default" : "secondary"}>{user.plan}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{user.apps_count}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground py-1.5">
            Trang {page} / {Math.ceil(total / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) { setSelectedId(null); setDetail(null) } }}>
        <DialogContent className="max-w-2xl">
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{detail.email}</span>
                  <Badge variant={detail.plan !== "free" ? "default" : "secondary"}>{detail.plan}</Badge>
                </DialogTitle>
                <DialogDescription>{detail.discord_username}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Subscription */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Đăng ký</p>
                  <div className="rounded-md border p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {detail.subscription ? (
                        <>
                          <Badge variant="default">{detail.subscription.display_name ?? detail.subscription.status}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {detail.subscription.status === "active" && detail.subscription.renews_at
                              ? `Gia hạn ${new Date(detail.subscription.renews_at).toLocaleDateString()}`
                              : `Trạng thái: ${detail.subscription.status}`}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Không có đăng ký đang hoạt động</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Apps */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Ứng dụng ({detail.apps.length})
                  </p>
                  <div className="space-y-1.5">
                    {detail.apps.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Không có ứng dụng</p>
                    ) : (
                      detail.apps.map((app) => (
                        <div key={app.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
                          <span className="text-sm font-medium">{app.name}</span>
                          <Badge variant={app.enabled ? "outline" : "destructive"} className="text-xs">
                            {app.enabled ? "đang bật" : "đã tắt"}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Thao tác</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleForceLogout(detail.id)}>
                      <LogOut className="size-3.5" /> Buộc đăng xuất
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
