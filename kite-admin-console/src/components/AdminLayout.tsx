import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  Bot,
  ScrollText,
  CreditCard,
  DollarSign,
  LogOut,
  Moon,
  Sun,
} from "lucide-react"
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
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/context/AuthContext"

type Page =
  | "dashboard"
  | "users"
  | "apps"
  | "logs"
  | "billing"
  | "revenue"

interface AdminLayoutProps {
  children: (page: Page, setPage: (page: Page) => void) => React.ReactNode
}

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { id: "users", label: "Người dùng", icon: Users },
  { id: "apps", label: "Ứng dụng", icon: Bot },
  { id: "logs", label: "Trình xem nhật ký", icon: ScrollText },
  { id: "billing", label: "Thanh toán", icon: CreditCard },
  { id: "revenue", label: "Doanh thu", icon: DollarSign },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const [page, setPage] = useState<Page>("dashboard")
  const { theme, setTheme } = useTheme()
  const { logout, user } = useAuth()

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border pb-2">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              K
            </div>
            <span className="font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
              Kite Admin
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Hệ thống</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={page === item.id}
                      onClick={() => setPage(item.id)}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border pt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={user?.username ?? ""}>
                <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {user?.username?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <span className="text-xs truncate">{user?.username ?? ""}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/95 backdrop-blur px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={logout}>
            <LogOut className="size-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-auto">
          {children(page, setPage)}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
