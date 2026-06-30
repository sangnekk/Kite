import { LogInIcon, PackageIcon } from "lucide-react";
import HomeNavbarMenu from "./HomeNavbarMenu";
import { Button } from "../ui/button";
import Link from "next/link";
import { useUser } from "@/lib/hooks/api";

export default function HomeNavbar() {
  const user = useUser();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0908]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-2.5 sm:px-6">
        <HomeNavbarMenu />
        <div className="flex items-center">
          {user ? (
            <Button
              asChild
              className="bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary))] hover:bg-primary/90"
            >
              <Link href="/apps" className="flex items-center space-x-1.5">
                <PackageIcon className="h-5 w-5" />
                <span>Mở ứng dụng</span>
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              className="bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary))] hover:bg-primary/90"
            >
              <Link href="/login" className="flex items-center space-x-2">
                <LogInIcon className="h-5 w-5" />
                <span>Đăng nhập</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
