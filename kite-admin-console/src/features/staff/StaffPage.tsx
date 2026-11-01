import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Crown, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { DateTime, ErrorState, IdText } from "@/components/common/Misc"
import { PageHeader } from "@/components/common/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { api, errorMessage } from "@/lib/api"
import type { StaffList, StaffMember } from "@/lib/types"

const KEY = ["staff"] as const
const SNOWFLAKE = /^\d{15,25}$/

const ROLES = [
  { value: "admin", label: "Quản trị viên", hint: "Xem và thay đổi dữ liệu, gói, giao dịch." },
  { value: "staff", label: "Nhân viên", hint: "Chỉ xem, không thay đổi được gì." },
]

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: "admin" | "staff") => void
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as "admin" | "staff")} disabled={disabled}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [discordId, setDiscordId] = useState("")
  const [role, setRole] = useState<"admin" | "staff">("staff")
  const [error, setError] = useState<string | null>(null)

  const valid = SNOWFLAKE.test(discordId.trim())

  const add = useAdminMutation(
    () => api<StaffMember>("/staff", { method: "POST", body: { discord_id: discordId.trim(), role } }),
    { invalidate: [KEY], success: "Đã thêm nhân sự", toastError: false }
  )

  async function submit() {
    setError(null)
    try {
      await add.mutateAsync()
      setDiscordId("")
      setRole("staff")
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !add.isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm nhân sự</DialogTitle>
          <DialogDescription>
            Người này đăng nhập trang quản trị bằng tài khoản Discord của họ. Không cần họ đã từng dùng Vibe Bot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-discord-id">Discord ID</Label>
            <Input
              id="staff-discord-id"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              placeholder="867040792463802389"
              inputMode="numeric"
              aria-invalid={discordId !== "" && !valid}
            />
            <p className="text-xs text-muted-foreground">
              Bật Developer Mode trong Discord, chuột phải vào người dùng rồi chọn “Copy User ID”.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Vai trò</Label>
            <RoleSelect value={role} onChange={setRole} />
            <p className="text-xs text-muted-foreground">{ROLES.find((r) => r.value === role)?.hint}</p>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={add.isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={!valid || add.isPending} onClick={() => void submit()}>
            {add.isPending && <Spinner />}
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Component() {
  const staff = useQuery({ queryKey: KEY, queryFn: ({ signal }) => api<StaffList>("/staff", { signal }) })
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<StaffMember | null>(null)

  const changeRole = useAdminMutation(
    ({ member, role }: { member: StaffMember; role: "admin" | "staff" }) =>
      api<StaffMember>(`/staff/${member.discord_id}`, { method: "PUT", body: { role } }),
    { invalidate: [KEY], success: "Đã đổi vai trò" }
  )
  const remove = useAdminMutation(
    (member: StaffMember) => api(`/staff/${member.discord_id}`, { method: "DELETE" }),
    { invalidate: [KEY], success: "Đã xóa nhân sự", toastError: false }
  )

  return (
    <>
      <PageHeader
        title="Nhân sự"
        description="Ai được vào trang quản trị. Thay đổi có hiệu lực ngay ở lần thao tác tiếp theo của họ."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus /> Thêm nhân sự
          </Button>
        }
      />

      {staff.error ? (
        <ErrorState error={staff.error} onRetry={() => void staff.refetch()} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Người dùng</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Thêm bởi</TableHead>
                <TableHead>Ngày thêm</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.isPending ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {staff.data.system_owner && (
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Crown className="size-4 text-amber-500" />
                          <IdText value={staff.data.system_owner} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge>Chủ hệ thống</Badge>
                      </TableCell>
                      <TableCell colSpan={3} className="text-sm text-muted-foreground">
                        Đặt trong file cấu hình (<code>system_owner</code>), không sửa được ở đây.
                      </TableCell>
                    </TableRow>
                  )}
                  {staff.data.staff.map((member) => (
                    <TableRow key={member.discord_id}>
                      <TableCell>
                        <div className="space-y-1">
                          {member.username && <div className="font-medium">@{member.username}</div>}
                          <IdText value={member.discord_id} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleSelect
                          value={member.role}
                          disabled={changeRole.isPending}
                          onChange={(role) => role !== member.role && changeRole.mutate({ member, role })}
                        />
                      </TableCell>
                      <TableCell>
                        <code className="font-mono text-xs">{member.added_by}</code>
                      </TableCell>
                      <TableCell>
                        <DateTime value={member.created_at} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setRemoving(member)}>
                          <Trash2 /> Xóa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {staff.data.staff.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        Chưa có nhân sự nào ngoài chủ hệ thống.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AddDialog open={adding} onOpenChange={setAdding} />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Xóa khỏi nhân sự?"
        description={
          <>
            <strong>{removing?.username ? `@${removing.username}` : removing?.discord_id}</strong> sẽ không vào được trang
            quản trị nữa.
          </>
        }
        confirmLabel="Xóa"
        destructive
        onConfirm={() => remove.mutateAsync(removing!)}
      />
    </>
  )
}
