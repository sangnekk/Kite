import { Outlet } from "react-router"
import { ShieldAlert } from "lucide-react"
import { useCan } from "@/auth/session"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { Role } from "@/lib/types"

/** Route guard: the page is only for admins with at least `min`. */
export function RequireRole({ min }: { min: Role }) {
  const allowed = useCan(min)
  if (allowed) return <Outlet />

  return (
    <Empty className="m-6 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldAlert />
        </EmptyMedia>
        <EmptyTitle>Bạn không có quyền xem trang này</EmptyTitle>
        <EmptyDescription>
          Trang này chỉ dành cho {min === "owner" ? "chủ hệ thống" : "quản trị viên"}.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
