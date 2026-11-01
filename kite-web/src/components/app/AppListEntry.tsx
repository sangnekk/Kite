import { App } from "@/lib/types/wire.gen";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/common/UserAvatar";
import Link from "next/link";

/**
 * Where an app of the list comes from, for the apps the user does not own.
 * Who added the user is only known for collaborators added after it was
 * recorded; for the others the owner is named instead of guessing.
 */
function AppOrigin({ app }: { app: App }) {
  if (!app.owner) return null;

  if (app.invited_by) {
    return (
      <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
        <UserAvatar user={app.invited_by} className="h-4 w-4 rounded-full" />
        <span>
          Được thêm cộng tác bởi{" "}
          <span className="font-medium text-foreground">
            {app.invited_by.display_name}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
      <UserAvatar user={app.owner} className="h-4 w-4 rounded-full" />
      <span>
        Cộng tác viên · Chủ sở hữu:{" "}
        <span className="font-medium text-foreground">
          {app.owner.display_name}
        </span>
      </span>
    </div>
  );
}

export default function AppListEntry({ app }: { app: App }) {
  return (
    <Card>
      <Button size="sm" variant="outline" className="float-right m-3" asChild>
        <Link
          href={{
            pathname: "/apps/[appId]",
            query: { appId: app.id },
          }}
        >
          Open app
        </Link>
      </Button>
      <CardHeader>
        <CardTitle className="text-base flex items-center space-x-3">
          {/* The id of a bot user is the id of its application. */}
          <UserAvatar
            user={{
              discord_id: app.discord_id,
              discord_avatar: app.discord_avatar,
              display_name: app.name,
            }}
            className="h-9 w-9 rounded-lg"
          />
          <div>{app.name}</div>
        </CardTitle>
        <CardDescription className="text-sm">{app.description}</CardDescription>
        <AppOrigin app={app} />
      </CardHeader>
    </Card>
  );
}
