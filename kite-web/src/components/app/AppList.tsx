import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "../ui/skeleton";

import { useAppsQuery } from "@/lib/api/queries";
import { useUser } from "@/lib/hooks/api";
import { groupApps, SEARCH_MIN_APPS } from "@/lib/appList";
import { App } from "@/lib/types/wire.gen";
import { BotIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useMemo, useState } from "react";
import AutoAnimate from "../common/AutoAnimate";
import AppCreateDialog from "./AppCreateDialog";
import AppListEntry from "./AppListEntry";

function CreateAppButton() {
  return (
    <AppCreateDialog>
      <Button className="h-11 w-full sm:h-9 sm:w-auto">Tạo ứng dụng</Button>
    </AppCreateDialog>
  );
}

function Notice({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <div className="font-semibold">{title}</div>
      {children && (
        <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
      )}
      {action && <div className="w-full pt-2 sm:w-auto">{action}</div>}
    </Card>
  );
}

function AppGroup({ title, apps }: { title?: string; apps: App[] }) {
  return (
    <section>
      {title && (
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          {title} · {apps.length}
        </h2>
      )}
      <AutoAnimate className="grid gap-3 md:grid-cols-2">
        {apps.map((app) => (
          <AppListEntry app={app} key={app.id} />
        ))}
      </AutoAnimate>
    </section>
  );
}

export default function AppList() {
  const router = useRouter();
  const query = useAppsQuery();
  const user = useUser();
  const [search, setSearch] = useState("");

  const response = query.data;
  const apps = response?.success ? response.data : undefined;

  // A request that failed (no connection) or was refused by the server.
  const failure = query.isError
    ? "Không kết nối được tới máy chủ."
    : response && !response.success
    ? `${response.error.message} (${response.error.code})`
    : undefined;

  useEffect(() => {
    if (response && !response.success && response.error.code === "unauthorized") {
      router.push("/login");
    }
  }, [response, router]);

  const total = apps?.filter(Boolean).length ?? 0;
  const showSearch = total >= SEARCH_MIN_APPS;

  const groups = useMemo(
    () => groupApps(apps ?? [], { userId: user?.id, query: showSearch ? search : "" }),
    [apps, user?.id, search, showSearch]
  );

  if (query.isPending) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-[88px]" />
        <Skeleton className="h-[88px]" />
        <Skeleton className="h-[88px]" />
      </div>
    );
  }

  if (failure !== undefined) {
    return (
      <Notice
        icon={<TriangleAlertIcon className="h-8 w-8" />}
        title="Không tải được danh sách ứng dụng"
        action={
          <Button
            variant="outline"
            className="h-11 w-full sm:h-9 sm:w-auto"
            onClick={() => void query.refetch()}
          >
            Thử lại
          </Button>
        }
      >
        {failure}
      </Notice>
    );
  }

  if (total === 0) {
    return (
      <Notice
        icon={<BotIcon className="h-8 w-8" />}
        title="Bạn chưa có ứng dụng nào"
        action={<CreateAppButton />}
      >
        Tạo ứng dụng đầu tiên để bắt đầu, hoặc nhờ nhóm của bạn mời bạn cộng
        tác vào ứng dụng của họ.
      </Notice>
    );
  }

  const visible = groups.mine.length + groups.invited.length;
  const bothGroups = groups.mine.length > 0 && groups.invited.length > 0;

  return (
    <div className="space-y-5">
      {showSearch && (
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm ứng dụng..."
          aria-label="Tìm ứng dụng"
          className="h-11 sm:h-9"
        />
      )}

      {visible === 0 ? (
        <Notice
          icon={<SearchXIcon className="h-8 w-8" />}
          title="Không tìm thấy ứng dụng nào"
          action={
            <Button
              variant="outline"
              className="h-11 w-full sm:h-9 sm:w-auto"
              onClick={() => setSearch("")}
            >
              Xóa tìm kiếm
            </Button>
          }
        >
          Không có ứng dụng nào khớp với “{search.trim()}”.
        </Notice>
      ) : (
        <>
          {groups.mine.length > 0 && (
            <AppGroup
              title={bothGroups ? "Của bạn" : undefined}
              apps={groups.mine}
            />
          )}
          {groups.invited.length > 0 && (
            <AppGroup
              title={bothGroups ? "Bạn được mời cộng tác" : undefined}
              apps={groups.invited}
            />
          )}
        </>
      )}

      <div className="flex">
        <CreateAppButton />
      </div>
    </div>
  );
}
