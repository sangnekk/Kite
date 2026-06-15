import { useState, useEffect, useCallback } from "react"
import { Search, Power, PowerOff, Skull, Trash2, RotateCcw, ChevronLeft, Loader2 } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"

interface AppListItem {
  id: string
  name: string
  owner_id: string
  owner_email: string | null
  enabled: boolean
  discord_status: Record<string, unknown> | null
  disabled_reason: string | null
  credits_used: number
  collaborators_count: number
  created_at: string
}

interface CollaboratorInfo {
  user_id: string
  role: string
}

interface AppDetail extends AppListItem {
  description: string | null
  creator_user_id: string
  discord_id: string | null
  collaborators: CollaboratorInfo[]
  resume_points_count: number
  updated_at: string
}

export function AppManagement() {
  const { apiFetch } = useAuth()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [apps, setApps] = useState<AppListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AppDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [disabledReason, setDisabledReason] = useState("")

  const pageSize = 20

  const fetchApps = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (search) params.set("search", search)
      const res = await apiFetch(`/apps?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setApps(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [apiFetch, search, page])

  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setSelectedId(id)
    setDisabledReason("")
    try {
      const res = await apiFetch(`/apps/${id}`)
      if (!res.ok) return
      const data = await res.json()
      setDetail(data)
      setDisabledReason(data.disabled_reason ?? "")
    } finally {
      setDetailLoading(false)
    }
  }, [apiFetch])

  async function updateApp(id: string, payload: Record<string, unknown>) {
    const res = await apiFetch(`/apps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return
    const updated = await res.json()
    if (selectedId === id) setDetail(updated)
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, ...updated } : a))
  }

  async function handleToggle(app: AppListItem) {
    await updateApp(app.id, { enabled: !app.enabled })
  }

  async function handleRotateToken(appId: string) {
    const res = await apiFetch(`/apps/${appId}/rotate-token`, { method: "POST" })
    if (!res.ok) return
    setDetail(await res.json())
  }

  async function handleKillFlows(appId: string) {
    await apiFetch(`/apps/${appId}/kill-flows`, { method: "POST" })
    if (detail?.id === appId) {
      setDetail({ ...detail, resume_points_count: 0 })
    }
  }

  const discordStatusColor: Record<string, string> = {
    online: "bg-green-500",
    idle: "bg-yellow-500",
    offline: "bg-muted-foreground",
  }

  function getDiscordStatusLabel(status: Record<string, unknown> | null): string {
    if (!status) return "offline"
    if (typeof status === "string") return status
    return (status as Record<string, string>)?.status ?? "offline"
  }

  if (selectedId) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedId(null); setDetail(null) }}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <Separator orientation="vertical" className="h-4" />
          {detail && (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{detail.name}</h1>
                <span className={`size-2 rounded-full ${discordStatusColor[getDiscordStatusLabel(detail.discord_status)]}`} />
                <Badge variant={detail.enabled ? "outline" : "destructive"}>
                  {detail.enabled ? "enabled" : "disabled"}
                </Badge>
              </div>
              <div className="ml-auto flex gap-2">
                <Button
                  variant={detail.enabled ? "destructive" : "default"}
                  size="sm"
                  onClick={() => updateApp(detail.id, { enabled: !detail.enabled, disabled_reason: detail.enabled ? (disabledReason || "Disabled by admin") : null })}
                >
                  {detail.enabled ? <><PowerOff className="size-3.5" /> Disable</> : <><Power className="size-3.5" /> Enable</>}
                </Button>
              </div>
            </>
          )}
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="runtime">Runtime</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">App ID</span>
                      <span className="font-mono text-xs">{detail.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Owner</span>
                      <span>{detail.owner_email ?? detail.owner_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{new Date(detail.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discord</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${discordStatusColor[getDiscordStatusLabel(detail.discord_status)]}`} />
                        <span className="capitalize">{getDiscordStatusLabel(detail.discord_status)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Collaborators</span>
                      <span>{detail.collaborators.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resume Points</span>
                      <span>{detail.resume_points_count}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Disable Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Disabled Reason</Label>
                      <Textarea
                        placeholder="Reason for disabling..."
                        value={disabledReason}
                        onChange={(e) => setDisabledReason(e.target.value)}
                        className="min-h-[80px] text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleRotateToken(detail.id)}
                    >
                      <RotateCcw className="size-3.5" /> Rotate Bot Token
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Runtime */}
            <TabsContent value="runtime" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={() => handleKillFlows(detail.id)}>
                  <Skull className="size-3.5" /> Kill All Flows
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleKillFlows(detail.id)}>
                  <Trash2 className="size-3.5" /> Clear Resume Points
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resume Points ({detail.resume_points_count})</CardTitle>
                  <CardDescription>Suspended flow states</CardDescription>
                </CardHeader>
                <CardContent>
                  {detail.resume_points_count === 0 ? (
                    <p className="text-sm text-muted-foreground">No active resume points</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {detail.resume_points_count} resume point(s) exist. Use the buttons above to clear them.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Usage */}
            <TabsContent value="usage" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Credits Used</CardTitle>
                  <CardDescription>{detail.credits_used.toLocaleString()} credits</CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">App Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Control, monitor, and debug Discord bots</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search apps by name..."
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Discord</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : apps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No apps found
                  </TableCell>
                </TableRow>
              ) : (
                apps.map((app) => (
                  <TableRow
                    key={app.id}
                    className="cursor-pointer"
                    onClick={() => fetchDetail(app.id)}
                  >
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{app.owner_email ?? app.owner_id}</TableCell>
                    <TableCell>
                      <Badge variant={app.enabled ? "outline" : "destructive"}>
                        {app.enabled ? "enabled" : "disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${discordStatusColor[getDiscordStatusLabel(app.discord_status)]}`} />
                        <span className="text-sm capitalize">{getDiscordStatusLabel(app.discord_status)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {app.credits_used.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="xs"
                        variant={app.enabled ? "destructive" : "outline"}
                        onClick={() => handleToggle(app)}
                      >
                        {app.enabled ? "Disable" : "Enable"}
                      </Button>
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
            Previous
          </Button>
          <span className="text-sm text-muted-foreground py-1.5">
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
