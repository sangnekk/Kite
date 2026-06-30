import env from "@/lib/env/client";
import { ChevronDown } from "lucide-react";
import Reveal from "./Reveal";

interface FAQProps {
  question: string;
  answer: string;
}

const FAQList: FAQProps[] = [
  {
    question: "Vibe Bot là gì?",
    answer:
      "Vibe Bot là nền tảng mã nguồn mở để xây dựng và lưu trữ bot Discord mà không cần viết một dòng code nào. Nó được hỗ trợ bởi trình soạn thảo no-code tiên tiến và miễn phí cho mọi người.",
  },
  {
    question: "Vibe Bot có miễn phí không?",
    answer:
      "Có. Vibe Bot là mã nguồn mở và miễn phí cho mọi người. Bot của bạn sẽ được lưu trữ 24/7 và tất cả các tính năng cần thiết đều miễn phí!",
  },
  {
    question: "Tôi có thể tùy chỉnh tên và ảnh đại diện của bot không?",
    answer:
      "Có. Với Vibe Bot bạn tự tạo bot nên có thể tùy chỉnh tên và ảnh đại diện tùy thích. Bạn còn có thể tùy chỉnh trạng thái và hoạt động của bot miễn phí, không giới hạn!",
  },
  {
    question: "Vibe Bot có hỗ trợ lệnh slash và các tính năng Discord khác không?",
    answer:
      "Vibe Bot hiện hỗ trợ lệnh slash, thành phần tin nhắn và bộ lắng nghe sự kiện. Bạn có thể phản hồi lệnh slash, thành phần tin nhắn và chạy hành động dựa trên sự kiện. Chúng tôi đang bổ sung thêm tính năng!",
  },
  {
    question: "Tôi có thể thêm bot vào bao nhiêu server?",
    answer:
      "Bạn có thể thêm bot vào tối đa 100 server. Giới hạn này có thể thay đổi trong tương lai.",
  },
  {
    question: "Tôi có thể tạo nhiều bot không?",
    answer:
      "Có. Bạn có thể tạo tối đa 10 bot với Vibe Bot. Giới hạn này có thể thay đổi trong tương lai.",
  },
];

export default function HomeFAQSection() {
  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="mb-12 text-center">
          <div className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Hỏi & Đáp
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-stone-50 md:text-4xl">
            Câu hỏi thường gặp
          </h2>
        </Reveal>

        <div className="space-y-3">
          {FAQList.map(({ question, answer }, i) => (
            <Reveal key={question} delay={i * 60}>
              <FAQItem question={question} answer={answer} />
            </Reveal>
          ))}
        </div>

        <p className="mt-10 text-center text-stone-400">
          Vẫn còn thắc mắc?{" "}
          <a
            rel="noreferrer noopener"
            href={env.NEXT_PUBLIC_DISCORD_LINK}
            target="_blank"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Tham gia server Discord
          </a>
        </p>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: FAQProps) {
  return (
    <details className="home-block group rounded-xl px-5 [&_svg]:open:-rotate-180">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-stone-100 transition-colors hover:text-white">
        <span>{question}</span>
        <ChevronDown className="h-4 w-4 flex-none text-stone-400 transition-transform duration-200" />
      </summary>
      <p className="pb-5 pr-8 text-sm leading-relaxed text-stone-400">
        {answer}
      </p>
    </details>
  );
}
