import z from "zod";

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_PUBLIC_BASE_URL: z.string().default("http://localhost:8080"),
  NEXT_PUBLIC_DOCS_LINK: z.string().default("http://localhost:4000"),
  NEXT_PUBLIC_GITHUB_LINK: z
    .string()
    .default("https://github.com/sangnekk/Kite"),
  NEXT_PUBLIC_DISCORD_LINK: z.string().default("https://discord.gg"),
  NEXT_PUBLIC_CONTACT_EMAIL: z.string().default("contact@kite.onl"),
  // Build/deploy label shown under the app name in the sidebar. Set it to
  // anything via the env (e.g. "Stable build"); when unset it falls back to
  // "Developer build". NEXT_PUBLIC_* is inlined at build time, so set it in the
  // Docker/compose build args, not at runtime.
  NEXT_PUBLIC_BUILD_LABEL: z.string().default("Developer build"),
});

export default clientEnvSchema.parse({
  NEXT_PUBLIC_API_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_API_PUBLIC_BASE_URL,
  NEXT_PUBLIC_DOCS_LINK: process.env.NEXT_PUBLIC_DOCS_LINK,
  NEXT_PUBLIC_GITHUB_LINK: process.env.NEXT_PUBLIC_GITHUB_LINK,
  NEXT_PUBLIC_DISCORD_LINK: process.env.NEXT_PUBLIC_DISCORD_LINK,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  NEXT_PUBLIC_BUILD_LABEL: process.env.NEXT_PUBLIC_BUILD_LABEL,
});
