import logo from "@/assets/logo/orange@1024.png";
import Link from "next/link";
import env from "@/lib/env/client";

export default function HomeFooter() {
  return (
    <footer id="footer" className="relative border-t border-white/10">
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-4 xl:grid-cols-6">
        <div className="col-span-full xl:col-span-2">
          <Link href="/" className="flex items-center gap-3">
            <img
              src={logo.src}
              alt="Vibe Bot"
              className="h-9 w-9 drop-shadow-[0_0_10px_rgba(249,115,22,0.7)]"
            />
            <span className="font-display text-xl font-semibold text-stone-100">
              Vibe Bot
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-stone-500">
            Dựng và lưu trữ bot Discord không cần code — mã nguồn mở, miễn phí.
          </p>
        </div>

        <FooterColumn title="Liên hệ">
          <FooterLink href={env.NEXT_PUBLIC_GITHUB_LINK} external>
            Github
          </FooterLink>
          <FooterLink href={env.NEXT_PUBLIC_DISCORD_LINK} external>
            Discord
          </FooterLink>
          <FooterLink href={`mailto:${env.NEXT_PUBLIC_CONTACT_EMAIL}`} external>
            Email
          </FooterLink>
        </FooterColumn>

        <FooterColumn title="Tài nguyên">
          <FooterLink href={env.NEXT_PUBLIC_DOCS_LINK} external>
            Tài liệu
          </FooterLink>
        </FooterColumn>

        <FooterColumn title="Pháp lý">
          <FooterLink href="/terms">Điều khoản dịch vụ</FooterLink>
          <FooterLink href="/privacy">Chính sách bảo mật</FooterLink>
          <FooterLink href="/refund">Chính sách hoàn tiền</FooterLink>
        </FooterColumn>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-12 sm:px-6">
        <p className="border-t border-white/5 pt-8 text-center font-mono text-xs text-stone-500">
          © {new Date().getFullYear()} Vibe Bot · dựa trên Kite của{" "}
          <a
            target="_blank"
            rel="noreferrer noopener"
            href="https://merlin.gg"
            className="text-stone-400 underline-offset-4 hover:text-primary hover:underline"
          >
            Merlin Fuchs
          </a>
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls = "text-sm text-stone-400 transition-colors hover:text-stone-100";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
