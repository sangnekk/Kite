import { ReactNode } from "react";
import HomeNavbar from "./HomeNavbar";
import BaseLayout from "../common/BaseLayout";
import HomeBackdrop from "./HomeBackdrop";

export default function HomeLayout({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <BaseLayout title={title} description={description}>
      {/* Force the editor-canvas dark theme regardless of the user's global
          theme — every shadcn primitive inside renders dark, then .home-canvas
          paints the deeper warm-black surface on top. overflow-x: clip keeps the
          glow blobs from spilling into horizontal scroll without breaking the
          sticky navbar. */}
      <div className="dark">
        <div
          className="home-canvas relative flex min-h-[100dvh] flex-col font-sans antialiased"
          style={{ overflowX: "clip" }}
        >
          <HomeBackdrop />
          <HomeNavbar />
          <main className="relative z-10 flex-auto">{children}</main>
        </div>
      </div>
    </BaseLayout>
  );
}
