import { NavLink, Outlet } from "react-router"
import { PageHeader } from "@/components/common/PageHeader"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "subscriptions", label: "Đăng ký" },
  { to: "entitlements", label: "Quyền sử dụng gói" },
  { to: "payments", label: "Giao dịch" },
]

export function Component() {
  return (
    <>
      <PageHeader
        title="Thanh toán"
        description="Đăng ký của người dùng, gói đang được áp dụng cho từng ứng dụng và các giao dịch chuyển khoản."
      />

      <nav className="mb-4 flex gap-1 border-b" aria-label="Mục thanh toán">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </>
  )
}
