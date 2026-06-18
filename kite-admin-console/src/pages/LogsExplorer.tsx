import { useState, useEffect, useCallback } from "react"
import { Search, ExternalLink, ListFilter as Filter, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { useAuth } from "@/context/AuthContext"

interface LogItem {
  id: number
  app_id: string
  app_name: string | null
  message: string | null
  level: string | null
  command_id: string | null
  event_listener_id: string | null
  message_id: string | null
  created_at: string
}

interface AppOption {
  id: string
  name: string
}

const levelVariant: Record<string, "destructive" | "secondary" | "outline"> = {
  error: "destructive",
  warn: "secondary",
  info: "outline",
}

const levelDot: Record<string, string> = {
  error: "bg-destructive",
  warn: "bg-yellow-500",
  info: "bg-green-500",
}

export function LogsExplorer() {
  const { apiFetch } = useAuth()
  const [search, setSearch] = useState("")
  const [filterLevel, setFilterLevel] = useState("all")
  const [filterApp, setFilterApp] = useState("all")
  const [selected, setSelected] = useState<LogItem | null>(null)
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [apps, setApps] = useState<AppOption[]>([])

  const pageSize = 50

  useEffect(() => {
    apiFetch("/logs/apps").then(async (res) => {
      if (res.ok) setApps(await res.json())
    })
  }, [apiFetch])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (search) params.set("search", search)
      if (filterLevel !== "all") params.set("level", filterLevel)
      if (filterApp !== "all") params.set("app_id", filterApp)
      const res = await apiFetch(`/logs?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setLogs(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [apiFetch, search, filterLevel, filterApp, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function getSource(log: LogItem): string {
    if (log.command_id) return "command"
    if (log.event_listener_id) return "event"
    if (log.message_id) return "message"
    return "system"
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trình xem nhật ký</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Theo dõi luồng thực thi và gỡ lỗi</p>
        </div>
        {!loading && (
          <div className="flex gap-2">
            <Badge variant="outline">{total} tổng cộng</Badge>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm nội dung..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setPage(1) }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả mức độ</SelectItem>
            <SelectItem value="error">Lỗi</SelectItem>
            <SelectItem value="warn">Cảnh báo</SelectItem>
            <SelectItem value="info">Thông tin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterApp} onValueChange={(v) => { setFilterApp(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả ứng dụng</SelectItem>
            {apps.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Thời gian</TableHead>
                <TableHead className="w-20">Mức độ</TableHead>
                <TableHead>Nội dung</TableHead>
                <TableHead className="w-36">Ứng dụng</TableHead>
                <TableHead className="w-24">Nguồn</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Không có nhật ký nào khớp với bộ lọc hiện tại
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(log)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${levelDot[log.level ?? ""] ?? "bg-muted-foreground"}`} />
                        <Badge variant={levelVariant[log.level ?? ""] ?? "outline"} className="text-[10px] h-4 px-1.5">
                          {log.level ?? "—"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="text-sm truncate block">{log.message ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{log.app_name ?? log.app_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">{getSource(log)}</Badge>
                    </TableCell>
                    <TableCell>
                      <ExternalLink className="size-3.5 text-muted-foreground" />
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
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${selected ? levelDot[selected.level ?? ""] ?? "bg-muted-foreground" : ""}`} />
              Chi tiết nhật ký
            </DialogTitle>
            <DialogDescription>{selected?.app_name ?? selected?.app_id}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Thời gian</p>
                  <p className="font-mono text-xs">{new Date(selected.created_at).toISOString()}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Mức độ</p>
                  <Badge variant={levelVariant[selected.level ?? ""] ?? "outline"}>{selected.level ?? "—"}</Badge>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Nguồn</p>
                  <Badge variant="outline">{getSource(selected)}</Badge>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">ID ứng dụng</p>
                  <p className="font-mono text-xs">{selected.app_id}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Nội dung</p>
                <pre className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap break-words">
                  {selected.message ?? "—"}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setFilterApp(selected.app_id); setSelected(null) }}
                >
                  <Filter className="size-3.5" /> Lọc theo ứng dụng này
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
