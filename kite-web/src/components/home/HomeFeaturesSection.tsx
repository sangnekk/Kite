import {
  Code2,
  Infinity as InfinityIcon,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  actionColor,
  controlColor,
  integrationColor,
  optionColor,
} from "@/lib/flow/nodes";
import { ReactNode } from "react";
import Reveal from "./Reveal";

interface FeatureProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
}

const iconCls = "h-5 w-5";

const features: FeatureProps[] = [
  {
    icon: <InfinityIcon className={iconCls} />,
    title: "Online 24/7",
    description:
      "Bot của bạn được lưu trữ và chạy liên tục — không lo downtime, không cần máy chủ riêng.",
    color: integrationColor,
  },
  {
    icon: <SlidersHorizontal className={iconCls} />,
    title: "Tùy chỉnh tất cả",
    description:
      "Đổi tên, ảnh đại diện, trạng thái và mọi hành vi của bot ngay trên giao diện trực quan.",
    color: optionColor,
  },
  {
    icon: <Code2 className={iconCls} />,
    title: "Không cần code",
    description:
      "Ghép các khối để dựng logic. Tạo bot hoàn chỉnh mà không viết một dòng code.",
    color: actionColor,
  },
  {
    icon: <Users className={iconCls} />,
    title: "Cộng tác nhóm",
    description:
      "Mời cả nhóm cùng dựng và chỉnh sửa bot cho server của bạn, theo thời gian thực.",
    color: controlColor,
  },
];

export default function HomeFeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <Reveal className="mb-14 text-center">
          <div className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Tất cả trong một
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-stone-50 md:text-4xl">
            Mọi khối bạn cần để dựng bot
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-400">
            Vibe Bot gói toàn bộ công cụ làm bot Discord vào một canvas duy nhất.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon, title, description, color }, i) => (
            <Reveal key={title} delay={i * 90}>
              <article
                className="home-block group relative h-full overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                style={
                  {
                    "--c": color,
                  } as React.CSSProperties
                }
              >
                {/* Glow that blooms from the icon on hover. */}
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-60"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <div
                  className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl text-white"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 8px 24px -6px ${color}`,
                  }}
                >
                  {icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-stone-100">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-stone-400">
                  {description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
