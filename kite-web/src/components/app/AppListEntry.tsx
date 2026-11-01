import { App } from "@/lib/types/wire.gen";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import UserAvatar from "@/components/common/UserAvatar";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import AppAvatar from "./AppAvatar";

function AppStatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge
      variant={enabled ? "outline" : "destructive"}
      className={cn(
        "shrink-0",
        enabled &&
          "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      )}
    >
      {enabled ? "Đang bật" : "Đã tắt"}
    </Badge>
  );
}

/**
 * Where an app of the list comes from, for the apps the user does not own.
 * Who added the user is only known for collaborators added after it was
 * recorded; for the others the owner is named instead of guessing.
 */
function AppOrigin({ app }: { app: App }) {
  if (!app.owner) return null;

  const person = app.invited_by ?? app.owner;

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <UserAvatar user={person} className="h-4 w-4 shrink-0 rounded-full" />
      <span className="truncate">
        {app.invited_by ? "Được thêm cộng tác bởi " : "Cộng tác viên · Chủ sở hữu: "}
        <span className="font-medium text-foreground">{person.display_name}</span>
      </span>
    </div>
  );
}

/**
 * The whole card is the link: on a phone the finger does not have to find a
 * small button, and the card has a focus ring for keyboard users.
 */
export default function AppListEntry({ app }: { app: App }) {
  return (
    <Link
      href={{
        pathname: "/apps/[appId]",
        query: { appId: app.id },
      }}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full transition-colors group-hover:bg-accent/40 group-active:bg-accent/60">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <AppAvatar app={app} className="h-11 w-11 shrink-0 rounded-lg" />

          {/* At least as tall as the avatar and centred against it, so the name
              of an app with nothing under it sits next to the middle of the
              avatar instead of its top. Longer content still starts at the top. */}
          <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="max-w-full truncate text-base font-semibold">
                {app.name}
              </span>
              <AppStatusBadge enabled={app.enabled} />
            </div>

            {app.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {app.description}
              </p>
            )}

            {!app.enabled && app.disabled_reason && (
              <p className="line-clamp-3 text-xs text-destructive">
                {app.disabled_reason}
              </p>
            )}

            <AppOrigin app={app} />
          </div>

          <ChevronRightIcon className="h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}
