import logo from "@/assets/logo/orange@1024.png";
import Link from "next/link";
import env from "@/lib/env/client";

export default function HomeFooter() {
  return (
    <footer id="footer">
      <hr className="w-11/12 mx-auto" />

      <section className="container py-20 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-12 gap-y-8">
        <div className="col-span-full xl:col-span-2">
          <Link
            rel="noreferrer noopener"
            href="/"
            className="font-bold text-xl flex items-center"
          >
            <img src={logo.src} alt="Vibe Bot Logo" className="h-10 w-10 mr-3" />
            <div>Vibe Bot</div>
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">Liên hệ</h3>
          <div>
            <a
              rel="noreferrer noopener"
              href={env.NEXT_PUBLIC_GITHUB_LINK}
              target="_blank"
              className="opacity-60 hover:opacity-100"
            >
              Github
            </a>
          </div>

          <div>
            <a
              rel="noreferrer noopener"
              href={env.NEXT_PUBLIC_DISCORD_LINK}
              target="_blank"
              className="opacity-60 hover:opacity-100"
            >
              Discord
            </a>
          </div>

          <div>
            <a
              rel="noreferrer noopener"
              href={`mailto:${env.NEXT_PUBLIC_CONTACT_EMAIL}`}
              target="_blank"
              className="opacity-60 hover:opacity-100"
            >
              Email
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">Tài nguyên</h3>
          <div>
            <a
              href={env.NEXT_PUBLIC_DOCS_LINK}
              className="opacity-60 hover:opacity-100"
              target="_blank"
            >
              Tài liệu
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">Pháp lý</h3>
          <div>
            <Link href="/terms" className="opacity-60 hover:opacity-100">
              Điều khoản dịch vụ
            </Link>
          </div>

          <div>
            <Link href="/privacy" className="opacity-60 hover:opacity-100">
              Chính sách bảo mật
            </Link>
          </div>

          <div>
            <Link href="/refund" className="opacity-60 hover:opacity-100">
              Chính sách hoàn tiền
            </Link>
          </div>
        </div>
      </section>

      <section className="container pb-14 text-center">
        <h3>
          Copyright &copy; {new Date().getFullYear()} tạo bởi{" "}
          <a
            target="_blank"
            href="https://merlin.gg"
            className="text-primary transition-all border-primary hover:border-b-2"
          >
            Merlin Fuchs
          </a>
        </h3>
      </section>
    </footer>
  );
}
