import {
  ChevronRightIcon,
  CrownIcon,
  LayoutDashboardIcon,
  MessageSquareWarningIcon,
  Settings2Icon,
  TelescopeIcon,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useAppId } from "@/lib/hooks/params";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";

export default function AppSidebarMainNav() {
  const appId = useAppId();
  const router = useRouter();

  const isActive = useCallback(
    (path: string, exact = false) => {
      if (exact) {
        return router.pathname === path;
      }

      return router.pathname.startsWith(path);
    },
    [router.pathname]
  );

  const items = useMemo(() => {
    return [
      {
        title: "Bảng điều khiển",
        url: "/apps/[appId]",
        icon: LayoutDashboardIcon,
        active: isActive("/apps/[appId]", true),
      },
      {
        title: "Premium",
        url: "/apps/[appId]/premium",
        icon: CrownIcon,
        active: isActive("/apps/[appId]/premium"),
      },
      {
        title: "Cài đặt",
        url: "/apps/[appId]/settings",
        icon: Settings2Icon,
        active: isActive("/apps/[appId]/settings"),
      },
      {
        title: "Nhật ký",
        url: "/apps/[appId]/logs",
        icon: MessageSquareWarningIcon,
        active: isActive("/apps/[appId]/logs"),
      },
      {
        title: "Khám phá",
        url: "#",
        icon: TelescopeIcon,
        active:
          isActive("/apps/[appId]/guilds") || isActive("/apps/[appId]/emojis"),
        items: [
          {
            title: "Server",
            url: "/apps/[appId]/guilds",
            active: isActive("/apps/[appId]/guilds"),
          },
          {
            title: "Emoji",
            url: "/apps/[appId]/emojis",
            active: isActive("/apps/[appId]/emojis"),
          },
        ],
      },
    ];
  }, [isActive]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Ứng dụng của tôi</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.active}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={subItem.active}>
                          <Link
                            href={{
                              pathname: subItem.url,
                              query: {
                                appId,
                              },
                            }}
                          >
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                asChild
                isActive={item.active}
              >
                <Link
                  href={{
                    pathname: item.url,
                    query: {
                      appId,
                    },
                  }}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
