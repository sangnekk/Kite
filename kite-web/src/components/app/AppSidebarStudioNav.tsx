import {
  VariableIcon,
  LibraryBigIcon,
  SlashSquareIcon,
  type LucideIcon,
  MailPlusIcon,
  SatelliteDishIcon,
  BlocksIcon,
  SparklesIcon,
  WebhookIcon,
  ClockIcon,
  DatabaseIcon,
} from "lucide-react";
import { useAppFeature } from "@/lib/hooks/api";
import { AI_FEATURES_ENABLED } from "@/lib/ai/featureFlags";

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

  const featureIncluded = useAppFeature((f) => f.ai_included);
  const aiIncluded = AI_FEATURES_ENABLED && featureIncluded;

  const items = useMemo(() => {
    return [
      ...(aiIncluded
        ? [
            {
              name: "Trợ lý AI",
              url: "/apps/[appId]/ai",
              icon: SparklesIcon,
              active: isActive("/apps/[appId]/ai"),
            },
          ]
        : []),
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
        name: "Lịch biểu",
        url: "/apps/[appId]/schedules",
        icon: ClockIcon,
        active: isActive("/apps/[appId]/schedules"),
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
        name: "Dữ liệu",
        url: "/apps/[appId]/data",
        icon: DatabaseIcon,
        active: isActive("/apps/[appId]/data"),
      },
      {
        name: "Plugin",
        url: "/apps/[appId]/plugins",
        icon: BlocksIcon,
        active: isActive("/apps/[appId]/plugins"),
      },
      {
        name: "Tích hợp",
        url: "/apps/[appId]/integrations",
        icon: WebhookIcon,
        active: isActive("/apps/[appId]/integrations"),
      },
      {
        name: "Mẫu",
        url: "/apps/[appId]/templates",
        icon: LibraryBigIcon,
        active: isActive("/apps/[appId]/templates"),
      },
    ];
  }, [isActive, aiIncluded]);

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
