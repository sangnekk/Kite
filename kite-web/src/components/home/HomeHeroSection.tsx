import { Button } from "@/components/ui/button";
import { ArrowRight, Github } from "lucide-react";
import env from "@/lib/env/client";
import Link from "next/link";
import HomeHeroConstellation from "./HomeHeroConstellation";

export default function HomeHeroSection() {
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <div className="text-center lg:text-left">
          {/* Eyebrow — mono, signaling the "editor" world and the offer. */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-stone-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Mã nguồn mở · Miễn phí · Online 24/7
          </div>

          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-stone-50 md:text-6xl xl:text-7xl">
            Ghép khối,
            <br />
            ra đời{" "}
            <span className="bg-gradient-to-r from-[#f9ad15] via-primary to-[#fb6f3b] bg-clip-text text-transparent">
              Bot Discord
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-stone-400 md:text-xl lg:mx-0">
            Vibe Bot biến từng khối thành lệnh slash, nút bấm và sự kiện. Kéo,
            thả, nối — bot của bạn chạy ngay, không viết một dòng code nào.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Button
              asChild
              size="lg"
              className="group w-full bg-primary text-base text-primary-foreground shadow-[0_12px_40px_-10px_hsl(var(--primary))] hover:bg-primary/90 sm:w-auto"
            >
              <Link href="/apps">
                Bắt đầu ngay
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-white/15 bg-white/5 text-base text-stone-200 hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <a
                rel="noreferrer noopener"
                href={env.NEXT_PUBLIC_GITHUB_LINK}
                target="_blank"
              >
                <Github className="mr-2 h-5 w-5" />
                Mã nguồn GitHub
              </a>
            </Button>
          </div>
        </div>

        {/* The thesis: a live flow graph of a real command. */}
        <div className="hidden lg:block">
          <HomeHeroConstellation />
        </div>
      </div>
    </section>
  );
}
