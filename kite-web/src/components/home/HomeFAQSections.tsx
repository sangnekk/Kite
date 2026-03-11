import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import env from "@/lib/env/client";
import { ChevronDown } from "lucide-react";

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
    <section id="faq" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold mb-4">
        Câu hỏi{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          thường gặp
        </span>
      </h2>

      <Accordion type="single" collapsible className="w-full AccordionRoot">
        {FAQList.map(({ question, answer }: FAQProps) => (
          <FAQItem key={question} question={question} answer={answer} />
        ))}
      </Accordion>

      <h3 className="font-medium mt-4">
        Vẫn còn thắc mắc?{" "}
        <a
          rel="noreferrer noopener"
          href={env.NEXT_PUBLIC_DISCORD_LINK}
          target="_blank"
          className="text-primary transition-all border-primary hover:border-b-2"
        >
          Tham gia server Discord
        </a>
      </h3>
    </section>
  );
}

function FAQItem({ question, answer }: FAQProps) {
  return (
    <details className="text-left border-b [&_svg]:open:-rotate-180">
      <summary className="flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline cursor-pointer">
        <div>{question}</div>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      </summary>

      <div className="overflow-hidden text-sm transition-all">
        <p className="pb-4 pt-0">{answer}</p>
      </div>
    </details>
  );
}
