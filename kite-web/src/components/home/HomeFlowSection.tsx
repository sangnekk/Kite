import {
  MousePointerClick,
  SatelliteDish,
  SquareSlash,
} from "lucide-react";
import FlowExample from "../flow/FlowExample";
import { actionColor, entryColor, suspendColor } from "@/lib/flow/nodes";
import FlowBlock from "./FlowBlock";
import Reveal from "./Reveal";
import { ReactNode } from "react";

interface ServiceProps {
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
}

const iconCls = "h-[18px] w-[18px]";

const serviceList: ServiceProps[] = [
  {
    title: "Lệnh tùy chỉnh",
    description: "Tạo lệnh slash riêng để người dùng gọi bot của bạn.",
    icon: <SquareSlash className={iconCls} />,
    color: entryColor,
  },
  {
    title: "Thành phần tương tác",
    description: "Thêm nút bấm và menu để người dùng tương tác trực tiếp.",
    icon: <MousePointerClick className={iconCls} />,
    color: actionColor,
  },
  {
    title: "Lắng nghe sự kiện",
    description: "Phản hồi sự kiện trong server bằng logic của riêng bạn.",
    icon: <SatelliteDish className={iconCls} />,
    color: suspendColor,
  },
];

export default function HomeFlowSection() {
  return (
    <section id="flow" className="relative py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <div className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Lập trình trực quan
          </div>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-stone-50 md:text-4xl">
            Viết logic bằng cách{" "}
            <span className="bg-gradient-to-r from-primary to-[#fb6f3b] bg-clip-text text-transparent">
              nối các khối
            </span>
          </h2>
          <p className="mt-4 max-w-xl text-lg text-stone-400">
            Mỗi khối là một bước. Nối chúng lại để dựng lệnh slash, nút bấm và
            phản hồi sự kiện — tất cả trên một canvas trực quan.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {serviceList.map(({ icon, title, description, color }, i) => (
              <Reveal key={title} delay={i * 90}>
                <FlowBlock
                  color={color}
                  icon={icon}
                  title={title}
                  description={description}
                  className="px-4 py-3.5"
                />
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Real editor canvas, framed like an app window. */}
        <Reveal delay={120}>
          <div className="home-block overflow-hidden rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 font-mono text-xs text-stone-400">
                ban.flow
              </span>
              <span className="ml-auto font-mono text-[11px] text-stone-500">
                5 khối · 4 kết nối
              </span>
            </div>
            <div className="h-[460px] w-full bg-[#0c0a09]/60">
              <FlowExample />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
