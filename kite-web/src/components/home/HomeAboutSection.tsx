import HomeStatistics from "./HomeStatistics";
import pilot from "@/assets/pilot.png";

export default function HomeAboutSection() {
  return (
    <section id="about" className="container py-24 sm:py-32">
      <div className="bg-muted/50 border rounded-lg py-12">
        <div className="px-6 flex flex-col-reverse md:flex-row gap-8 md:gap-12">
          <img
            src={pilot.src}
            alt=""
            className="w-[300px] object-contain rounded-lg"
          />
          <div className="bg-green-0 flex flex-col justify-between">
            <div className="pb-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
                  Giới thiệu{" "}
                </span>
                Vibe Bot
              </h2>
              <p className="text-xl text-muted-foreground mt-4">
                Vibe Bot là nền tảng mã nguồn mở cho phép bạn tạo và lưu trữ bot
                Discord mà không cần viết code. Được hỗ trợ bởi trình soạn thảo
                no-code tiên tiến và hoàn toàn miễn phí cho mọi người.
              </p>
            </div>

            <HomeStatistics />
          </div>
        </div>
      </div>
    </section>
  );
}
