export default function userAvatar({
  id,
  avatar,
  size,
}: {
  id: string;
  avatar?: string | null;
  /** Edge of the image in pixels (a power of two from 16 to 4096). */
  size?: number;
}) {
  const query = size ? `?size=${size}` : "";

  if (avatar) {
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png${query}`;
  }

  // Users without an avatar get one of Discord's default images, picked from
  // their id. An id that is not a number cannot be mapped to one.
  const index = /^\d+$/.test(id) ? (BigInt(id) >> BigInt(22)) % BigInt(6) : 0;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
