import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { discordAvatarUrl, initials } from "@/lib/format"

export function UserAvatar({
  user,
  className,
}: {
  user: { discord_id: string; discord_avatar: string | null; display_name: string }
  className?: string
}) {
  const src = discordAvatarUrl(user.discord_id, user.discord_avatar)
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback>{initials(user.display_name)}</AvatarFallback>
    </Avatar>
  )
}

export function UserCell({
  user,
}: {
  user: { discord_id: string; discord_avatar: string | null; display_name: string; discord_username: string }
}) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar user={user} className="size-8" />
      <div className="min-w-0">
        <div className="truncate font-medium">{user.display_name}</div>
        <div className="truncate text-xs text-muted-foreground">@{user.discord_username}</div>
      </div>
    </div>
  )
}
