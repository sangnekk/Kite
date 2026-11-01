import UserAvatar from "@/components/common/UserAvatar";

/**
 * The avatar of the bot of an app, as the app list, the app card and the app
 * switcher show it. The id of a bot user is the id of its application, so a bot
 * that has not connected yet still gets Discord's default avatar for its id.
 */
export default function AppAvatar({
  app,
  className,
}: {
  app?: {
    name: string;
    discord_id: string;
    discord_avatar?: string | null;
  };
  className?: string;
}) {
  return (
    <UserAvatar
      user={
        app && {
          discord_id: app.discord_id,
          discord_avatar: app.discord_avatar,
          display_name: app.name,
        }
      }
      className={className ?? "h-9 w-9 rounded-lg"}
    />
  );
}
