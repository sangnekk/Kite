import { Button } from "@/components/ui/button";
import Link from "next/link";
import env from "@/lib/env/client";
import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";

export default function HomeCTASection() {
  return (
    <section id="cta" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <Reveal>
          <div className="home-block relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12">
            {/* Orange core glow behind the panel. */}
            <div
              className="home-glow home-glow--orange"
              aria-hidden
              style={{
                top: "-40%",
                left: "50%",
                width: "520px",
                height: "520px",
                transform: "translateX(-50%)",
              }}
            />

            <h2 className="font-display text-3xl font-bold tracking-tight text-stone-50 md:text-5xl">
              Dựng bot Discord của bạn,{" "}
              <span className="bg-gradient-to-r from-[#f9ad15] via-primary to-[#fb6f3b] bg-clip-text text-transparent">
                miễn phí
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-400">
              Không thẻ tín dụng, không cần code. Mở canvas và ghép khối đầu tiên
              ngay bây giờ.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
                <a href={env.NEXT_PUBLIC_DISCORD_LINK} target="_blank">
                  Tham gia Discord
                </a>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
