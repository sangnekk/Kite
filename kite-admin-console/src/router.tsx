import { createBrowserRouter, Navigate, type NonIndexRouteObject, type RouteObject } from "react-router"
import { AuthGate } from "@/auth/session"
import { AppLayout } from "@/components/layout/AppLayout"
import { RouteError, NotFoundPage } from "@/components/common/RouteError"
import { RequireRole } from "@/components/common/RequireRole"

// Pages are loaded on demand: the charts library alone is large and only two
// pages need it.
export interface RouteHandle {
  title: string
}

type Page = Pick<NonIndexRouteObject, "lazy" | "handle">

const page = (title: string, load: () => Promise<{ Component: React.ComponentType }>): Page => ({
  lazy: async () => ({ Component: (await load()).Component }),
  handle: { title } satisfies RouteHandle,
})

/** A route only admins with at least `min` may open. */
const guarded = (min: "admin" | "owner", path: string, pg: Page): RouteObject => ({
  path,
  element: <RequireRole min={min} />,
  children: [{ index: true, ...pg }],
})

export const routes: RouteObject[] = [
  {
    element: <AuthGate />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          { index: true, ...page("Tổng quan", () => import("@/features/dashboard/DashboardPage")) },

          {
            path: "users",
            handle: { title: "Người dùng" } satisfies RouteHandle,
            children: [
              { index: true, ...page("Người dùng", () => import("@/features/users/UsersPage")) },
              { path: ":userId", ...page("Chi tiết", () => import("@/features/users/UserDetailPage")) },
            ],
          },
          {
            path: "apps",
            handle: { title: "Ứng dụng" } satisfies RouteHandle,
            children: [
              { index: true, ...page("Ứng dụng", () => import("@/features/apps/AppsPage")) },
              { path: ":appId", ...page("Chi tiết", () => import("@/features/apps/AppDetailPage")) },
            ],
          },
          { path: "logs", ...page("Nhật ký", () => import("@/features/logs/LogsPage")) },

          {
            path: "billing",
            handle: { title: "Thanh toán" } satisfies RouteHandle,
            ...page("Thanh toán", () => import("@/features/billing/BillingLayout")),
            children: [
              { index: true, element: <Navigate to="subscriptions" replace /> },
              { path: "subscriptions", ...page("Gói đăng ký của người dùng", () => import("@/features/billing/SubscriptionsTab")) },
              { path: "entitlements", ...page("Quyền sử dụng gói", () => import("@/features/billing/EntitlementsTab")) },
              { path: "payments", ...page("Giao dịch", () => import("@/features/billing/PaymentsTab")) },
            ],
          },
          { path: "revenue", ...page("Doanh thu", () => import("@/features/revenue/RevenuePage")) },
          { path: "plans", ...page("Gói đăng ký", () => import("@/features/plans/PlansPage")) },

          guarded("admin", "audit", page("Nhật ký hành động", () => import("@/features/audit/AuditPage"))),
          guarded("owner", "staff", page("Nhân sự", () => import("@/features/staff/StaffPage"))),
          {
            path: "settings",
            handle: { title: "Cài đặt" } satisfies RouteHandle,
            element: <RequireRole min="owner" />,
            children: [
              {
                ...page("Cài đặt", () => import("@/features/settings/SettingsLayout")),
                children: [
                  { index: true, element: <Navigate to="billing" replace /> },
                  { path: ":group", ...page("Nhóm cài đặt", () => import("@/features/settings/SettingsGroupPage")) },
                ],
              },
            ],
          },

          { path: "*", element: <NotFoundPage />, handle: { title: "Không tìm thấy" } satisfies RouteHandle },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes, { basename: "/admin" })
