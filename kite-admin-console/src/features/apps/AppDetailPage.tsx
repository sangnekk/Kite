import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { ArrowLeft, Power, PowerOff, Trash2 } from "lucide-react"
import { Can } from "@/auth/session"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { DateTime, DetailRow, DetailSkeleton, ErrorState, IdText } from "@/components/common/Misc"
import { PageHeader } from "@/components/common/PageHeader"
import { EnabledBadge } from "@/components/common/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { api, errorMessage } from "@/lib/api"
import { formatNumber } from "@/lib/format"
import type { AppDetail } from "@/lib/types"

const MAX_REASON = 500

function DisableDialog({ app, open, onOpenChange }: { app: AppDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const disable = useAdminMutation(
    () =>
      api<AppDetail>(`/apps/${app.id}`, {
        method: "PATCH",
        body: { enabled: false, disabled_reason: reason.trim() },
      }),
    { invalidate: [["app", app.id], ["apps"]], success: "Đã tắt ứng dụng", toastError: false }
  )

  async function submit() {
    setError(null)
    try {
      await disable.mutateAsync()
      setReason("")
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !disable.isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tắt ứng dụng “{app.name}”?</DialogTitle>
          <DialogDescription>
            Bot sẽ ngắt kết nối khỏi Discord trên mọi máy chủ trong vài giây. Chủ sở hữu có thể bật lại bằng cách cập nhật token.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="disable-reason">Lý do (hiển thị cho chủ sở hữu)</Label>
          <Textarea
            id="disable-reason"
            value={reason}
            maxLength={MAX_REASON}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Vi phạm điều khoản sử dụng"
            rows={3}
          />
          <div className="text-right text-xs text-muted-foreground">
            {reason.length}/{MAX_REASON}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={disable.isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button variant="destructive" disabled={disable.isPending} onClick={() => void submit()}>
            {disable.isPending && <Spinner />}
            Tắt ứng dụng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Component() {
  const { appId = "" } = useParams()
  const [disabling, setDisabling] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [killing, setKilling] = useState(false)

  const app = useQuery({
    queryKey: ["app", appId],
    queryFn: ({ signal }) => api<AppDetail>(`/apps/${appId}`, { signal }),
  })

  const enable = useAdminMutation(
    () => api<AppDetail>(`/apps/${appId}`, { method: "PATCH", body: { enabled: true } }),
    { invalidate: [["app", appId], ["apps"]], success: "Đã bật lại ứng dụng", toastError: false }
  )

  const killFlows = useAdminMutation(
    () => api<{ deleted: number }>(`/apps/${appId}/kill-flows`, { method: "POST" }),
    {
      invalidate: [["app", appId]],
      toastError: false,
      success: (r) => `Đã dừng ${r.deleted} luồng đang chờ`,
    }
  )

  if (app.isPending) return <DetailSkeleton />
  if (app.error) return <ErrorState error={app.error} onRetry={() => void app.refetch()} />

  const a = app.data

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
        <Link to="/apps">
          <ArrowLeft /> Ứng dụng
        </Link>
      </Button>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {a.name}
            <EnabledBadge enabled={a.enabled} />
          </span>
        }
        description={a.description ?? undefined}
        actions={
          <Can role="admin">
            {a.enabled ? (
              <Button variant="outline" onClick={() => setDisabling(true)}>
                <PowerOff /> Tắt ứng dụng
              </Button>
            ) : (
              <Button onClick={() => setEnabling(true)}>
                <Power /> Bật lại
              </Button>
            )}
          </Can>
        }
      />

      {!a.enabled && a.disabled_reason && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <span className="font-medium">Lý do tắt:</span> {a.disabled_reason}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <DetailRow label="ID ứng dụng">
                <IdText value={a.id} />
              </DetailRow>
              <DetailRow label="Discord ID">
                <IdText value={a.discord_id} />
              </DetailRow>
              <DetailRow label="Chủ sở hữu">
                <Link to={`/users/${a.owner_id}`} className="underline-offset-4 hover:underline">
                  {a.owner_email ?? a.owner_id}
                </Link>
              </DetailRow>
              <DetailRow label="Ngày tạo">
                <DateTime value={a.created_at} />
              </DetailRow>
              <DetailRow label="Cập nhật">
                <DateTime value={a.updated_at} />
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sử dụng</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <DetailRow label="Credits đã dùng">{formatNumber(a.credits_used)}</DetailRow>
              <DetailRow label="Luồng đang chờ">{formatNumber(a.resume_points_count)}</DetailRow>
              <DetailRow label="Cộng tác viên">{a.collaborators.length}</DetailRow>
            </dl>
            <Button variant="link" size="sm" className="mt-2 -ml-3" asChild>
              <Link to={`/logs?app_id=${a.id}`}>Xem nhật ký của ứng dụng này</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cộng tác viên</CardTitle>
          </CardHeader>
          <CardContent>
            {a.collaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ứng dụng này chưa có cộng tác viên.</p>
            ) : (
              <ul className="divide-y">
                {a.collaborators.map((c) => (
                  <li key={c.user_id} className="flex items-center justify-between py-2">
                    <Link to={`/users/${c.user_id}`} className="font-mono text-sm underline-offset-4 hover:underline">
                      {c.user_id}
                    </Link>
                    <Badge variant="secondary">{c.role}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Can role="admin">
          <Card className="border-destructive/30 lg:col-span-2">
            <CardHeader>
              <CardTitle>Vùng nguy hiểm</CardTitle>
              <CardDescription>Các thao tác này ảnh hưởng ngay tới người dùng cuối của bot.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">Dừng các luồng đang chờ</div>
                <div className="text-muted-foreground">
                  Nút bấm và menu trên các tin nhắn cũ của bot sẽ ngừng hoạt động ({a.resume_points_count} luồng).
                </div>
              </div>
              <Button
                variant="destructive"
                disabled={a.resume_points_count === 0}
                onClick={() => setKilling(true)}
              >
                <Trash2 /> Dừng luồng
              </Button>
            </CardContent>
          </Card>
        </Can>
      </div>

      <DisableDialog app={a} open={disabling} onOpenChange={setDisabling} />

      <ConfirmDialog
        open={enabling}
        onOpenChange={setEnabling}
        title={`Bật lại “${a.name}”?`}
        description="Bot sẽ kết nối lại với Discord và lý do tắt sẽ được xóa."
        confirmLabel="Bật lại"
        onConfirm={() => enable.mutateAsync()}
      />

      <ConfirmDialog
        open={killing}
        onOpenChange={setKilling}
        title="Dừng các luồng đang chờ?"
        description={
          <>
            {formatNumber(a.resume_points_count)} luồng đang chờ người dùng bấm nút hoặc chọn menu sẽ bị xóa và không
            thể khôi phục.
          </>
        }
        confirmLabel="Dừng luồng"
        destructive
        requireText={a.name}
        onConfirm={() => killFlows.mutateAsync()}
      />
    </>
  )
}
