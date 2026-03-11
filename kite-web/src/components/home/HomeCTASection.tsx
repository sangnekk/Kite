import { Button } from "@/components/ui/button";
import Link from "next/link";
import env from "@/lib/env/client";

export default function HomeCTASection() {
  return (
    <section id="cta" className="bg-muted/50 py-16 mt-24 sm:mt-32">
      <div className="container lg:grid lg:grid-cols-2 place-items-center">
        <div className="lg:col-start-1">
          <h2 className="text-3xl md:text-4xl font-bold ">
            Tạo
            <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
              {" "}
              Bot Discord của bạn{" "}
            </span>
            miễn phí ngay bây giờ
          </h2>
          <p className="text-muted-foreground text-xl mt-4 mb-8 lg:mb-0">
            Vibe Bot giúp bạn tạo bot Discord mà không cần viết code. Hỗ trợ lệnh
            slash, nút bấm, sự kiện và nhiều tính năng khác.
          </p>
        </div>

        <div className="space-y-4 lg:col-start-2">
          <Button className="w-full md:mr-4 md:w-auto" asChild>
            <Link href="/apps">Bắt đầu ngay</Link>
          </Button>
          <Button variant="outline" className="w-full md:w-auto" asChild>
            <a href={env.NEXT_PUBLIC_DISCORD_LINK} target="_blank">
              Tham gia Discord
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
