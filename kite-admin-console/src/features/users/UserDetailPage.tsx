import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { ArrowLeft, LogOut } from "lucide-react"
import { Can } from "@/auth/session"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { DateTime, DetailRow, DetailSkeleton, ErrorState, IdText, SubscriptionEnd } from "@/components/common/Misc"
import { PageHeader } from "@/components/common/PageHeader"
import { EnabledBadge, StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { api } from "@/lib/api"
import type { UserDetail } from "@/lib/types"
import { UserAvatar } from "./UserCell"
import { UserPlanBadge } from "./UsersPage"

export function Component() {
  const { userId = "" } = useParams()
  const [confirmLogout, setConfirmLogout] = useState(false)

  const user = useQuery({
    queryKey: ["user", userId],
    queryFn: ({ signal }) => api<UserDetail>(`/users/${userId}`, { signal }),
  })

  const forceLogout = useAdminMutation(
    () => api<{ sessions_removed: number }>(`/users/${userId}/force-logout`, { method: "POST" }),
    {
      toastError: false,
      success: (r) => (r.sessions_removed > 0 ? `Đã đăng xuất ${r.sessions_removed} phiên` : "Người dùng không có phiên nào đang đăng nhập"),
    }
  )

  if (user.isPending) return <DetailSkeleton />
  if (user.error) return <ErrorState error={user.error} onRetry={() => void user.refetch()} />

  const u = user.data

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
        <Link to="/users">
          <ArrowLeft /> Người dùng
        </Link>
      </Button>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <UserAvatar user={u} className="size-9" />
            {u.display_name}
          </span>
        }
        description={`@${u.discord_username}`}
        actions={
          <Can role="admin">
            <Button variant="outline" onClick={() => setConfirmLogout(true)}>
              <LogOut /> Đăng xuất mọi thiết bị
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <DetailRow label="ID người dùng">
                <IdText value={u.id} />
              </DetailRow>
              <DetailRow label="Discord ID">
                <IdText value={u.discord_id} />
              </DetailRow>
              <DetailRow label="Email">{u.email}</DetailRow>
              <DetailRow label="Gói hiện tại">
                <UserPlanBadge plan={u.plan} />
              </DetailRow>
              <DetailRow label="Ngày tham gia">
                <DateTime value={u.created_at} />
              </DetailRow>
              <DetailRow label="Cập nhật">
                <DateTime value={u.updated_at} />
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đăng ký</CardTitle>
          </CardHeader>
          <CardContent>
            {u.subscription ? (
              <dl className="divide-y">
                <DetailRow label="Gói">{u.subscription.display_name}</DetailRow>
                <DetailRow label="Trạng thái">
                  <StatusBadge status={u.subscription.status} />
                </DetailRow>
                <DetailRow label="Kết thúc">
                  <SubscriptionEnd endsAt={u.subscription.ends_at} renewsAt={u.subscription.renews_at} />
                </DetailRow>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Người dùng này chưa đăng ký gói nào.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ứng dụng ({u.apps.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {u.apps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa tạo ứng dụng nào.</p>
            ) : (
              <ul className="divide-y">
                {u.apps.map((app) => (
                  <li key={app.id} className="flex items-center justify-between gap-3 py-2">
                    <Link to={`/apps/${app.id}`} className="font-medium underline-offset-4 hover:underline">
                      {app.name}
                    </Link>
                    <EnabledBadge enabled={app.enabled} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Đăng xuất người dùng khỏi mọi thiết bị?"
        description={
          <>
            Mọi phiên đăng nhập của <strong>{u.display_name}</strong> sẽ bị xóa. Họ cần đăng nhập lại bằng Discord.
          </>
        }
        confirmLabel="Đăng xuất"
        destructive
        onConfirm={() => forceLogout.mutateAsync()}
      />
    </>
  )
}
