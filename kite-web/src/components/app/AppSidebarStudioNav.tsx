import {
  VariableIcon,
  LibraryBigIcon,
  SlashSquareIcon,
  type LucideIcon,
  MailPlusIcon,
  SatelliteDishIcon,
  BlocksIcon,
} from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCallback, useMemo } from "react";
import { useAppId } from "@/lib/hooks/params";
import { useRouter } from "next/router";
import Link from "next/link";

export default function AppSidebarStudioNav() {
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
        name: "Lệnh",
        url: "/apps/[appId]/commands",
        icon: SlashSquareIcon,
        active: isActive("/apps/[appId]/commands"),
      },
      {
        name: "Sự kiện",
        url: "/apps/[appId]/events",
        icon: SatelliteDishIcon,
        active: isActive("/apps/[appId]/events"),
      },
      {
        name: "Mẫu tin nhắn",
        url: "/apps/[appId]/messages",
        icon: MailPlusIcon,
        active: isActive("/apps/[appId]/messages"),
      },
      {
        name: "Biến lưu trữ",
        url: "/apps/[appId]/variables",
        icon: VariableIcon,
        active: isActive("/apps/[appId]/variables"),
      },
      {
        name: "Plugin",
        url: "/apps/[appId]/plugins",
        icon: BlocksIcon,
        active: isActive("/apps/[appId]/plugins"),
      },
      {
        name: "Mẫu",
        url: "/apps/[appId]/templates",
        icon: LibraryBigIcon,
        active: isActive("/apps/[appId]/templates"),
      },
    ];
  }, [isActive]);

  return (
    <SidebarGroup className="">
      <SidebarGroupLabel>Xưởng</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild isActive={item.active}>
              <Link
                href={{
                  pathname: item.url,
                  query: {
                    appId,
                  },
                }}
              >
                <item.icon />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
