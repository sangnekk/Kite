import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import userAvatar from "@/tools/common/utils/discordCdn";

/** "Chi sa din" -> "CD". Used while the avatar loads or when it can't. */
export function userInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  return (first + last).toUpperCase();
}

/**
 * The Discord avatar of a user. Users without a custom avatar get Discord's
 * default one, and the initials show while it loads or if it fails to load.
 */
export default function UserAvatar({
  user,
  className,
}: {
  user?: {
    discord_id: string;
    discord_avatar?: string | null;
    display_name: string;
  };
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {user?.discord_id && (
        <AvatarImage
          src={userAvatar({
            id: user.discord_id,
            avatar: user.discord_avatar,
            // Shown at 32px, twice that keeps it sharp on dense screens.
            size: 64,
          })}
          alt=""
        />
      )}
      <AvatarFallback className="rounded-[inherit]">
        {userInitials(user?.display_name ?? "")}
      </AvatarFallback>
    </Avatar>
  );
}
