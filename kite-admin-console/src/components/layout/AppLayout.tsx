import { Fragment, Suspense } from "react"
import { Link, Outlet, useLocation, useMatches } from "react-router"
import {
  BadgeDollarSign,
  Bot,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Moon,
  ScrollText,
  Settings,
  Sun,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react"
import { atLeast, logout, ROLE_LABEL, useCurrentAdmin } from "@/auth/session"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { useTheme } from "@/components/theme-provider"
import { discordAvatarUrl, initials } from "@/lib/format"
import type { Role } from "@/lib/types"
import type { RouteHandle } from "@/router"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  min?: Role
}

const NAV: { label: string; items: NavItem[] }[] = [
  { label: "Tổng quan", items: [{ to: "/", label: "Bảng điều khiển", icon: LayoutDashboard, end: true }] },
  {
    label: "Vận hành",
    items: [
      { to: "/users", label: "Người dùng", icon: Users },
      { to: "/apps", label: "Ứng dụng", icon: Bot },
      { to: "/logs", label: "Nhật ký", icon: ScrollText },
    ],
  },
  {
    label: "Kinh doanh",
    items: [
      { to: "/billing", label: "Thanh toán", icon: CreditCard },
      { to: "/revenue", label: "Doanh thu", icon: BadgeDollarSign },
      { to: "/plans", label: "Gói đăng ký", icon: Tags },
    ],
  },
  {
    label: "Quản trị",
    items: [
      { to: "/audit", label: "Nhật ký hành động", icon: History, min: "admin" },
      { to: "/staff", label: "Nhân sự", icon: UserCog, min: "owner" },
      { to: "/settings", label: "Cài đặt", icon: Settings, min: "owner" },
    ],
  },
]

function Crumbs() {
  const matches = useMatches()
  const crumbs = matches
    .filter((m) => (m.handle as RouteHandle | undefined)?.title)
    .map((m) => ({ title: (m.handle as RouteHandle).title, to: m.pathname }))
    // A parent and its index route share a title and a path, show it once.
    .filter((c, i, all) => i === 0 || c.to !== all[i - 1].to)

  if (crumbs.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.to}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.to}>{crumb.title}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Đổi giao diện sáng/tối"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  )
}

function UserMenu() {
  const me = useCurrentAdmin()
  const avatar = discordAvatarUrl(me.discord_id, me.discord_avatar)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-2 px-2">
          <Avatar className="size-6">
            {avatar && <AvatarImage src={avatar} alt="" />}
            <AvatarFallback className="text-[10px]">{initials(me.display_name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm sm:inline">{me.display_name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="truncate text-sm font-medium">{me.display_name}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">@{me.discord_username}</div>
          <div className="text-xs font-normal text-muted-foreground">{ROLE_LABEL[me.role]}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(item.to + "/")
}

export function AppLayout() {
  const me = useCurrentAdmin()
  const { pathname } = useLocation()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              K
            </div>
            <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">Vibe Bot Admin</span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {NAV.map((group) => {
            const items = group.items.filter((item) => !item.min || atLeast(me.role, item.min))
            if (items.length === 0) return null

            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={isNavActive(item, pathname)} tooltip={item.label}>
                          <Link to={item.to}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="px-2 py-1">{ROLE_LABEL[me.role]}</div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Crumbs />
          <div className="flex-1" />
          <ThemeToggle />
          <UserMenu />
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Suspense
            fallback={
              <div className="flex justify-center py-24">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
