import { NavLink, Outlet } from "react-router"
import { PageHeader } from "@/components/common/PageHeader"
import { cn } from "@/lib/utils"
import { GROUPS } from "./groups"

export function Component() {
  return (
    <>
      <PageHeader
        title="Cài đặt"
        description="Cấu hình vận hành được lưu trong cơ sở dữ liệu. Chỉ chủ hệ thống xem và sửa được; các giá trị bí mật không bao giờ được hiển thị lại."
      />

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Nhóm cài đặt">
          {GROUPS.map((g) => (
            <NavLink
              key={g.id}
              to={g.id}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )
              }
            >
              {g.label}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </>
  )
}
