import { AlignLeft, Ban, Reply, SquareSlash, User } from "lucide-react";
import FlowBlock from "./FlowBlock";
import FlowWire from "./FlowWire";
import {
  actionColor,
  entryColor,
  optionColor,
} from "@/lib/flow/nodes";
import { ReactNode } from "react";

// Virtual coordinate space — the SVG viewBox and the block positions share it,
// and the container keeps this exact aspect ratio so wires meet the blocks.
const W = 560;
const H = 560;

function Node({
  x,
  y,
  w,
  delay,
  children,
}: {
  x: number;
  y: number;
  w: number;
  delay: number;
  children: ReactNode;
}) {
  return (
    <div
      className="home-float absolute"
      style={{
        left: `${(x / W) * 100}%`,
        top: `${(y / H) * 100}%`,
        width: `${(w / W) * 100}%`,
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * The hero thesis: a real bot — the `/ban` command — rendered as a live flow
 * graph. Two argument nodes feed the command, which bans the member and replies.
 * Same node language as the editor, so the page *is* the product.
 */
export default function HomeHeroConstellation() {
  const icon = "h-[18px] w-[18px]";

  return (
    <div
      className="relative mx-auto w-full max-w-[600px]"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        fill="none"
        aria-hidden
      >
        {/* Both argument nodes converge on the command's top handle. */}
        <FlowWire from={{ x: 96, y: 68 }} to={{ x: 280, y: 158 }} color={optionColor} />
        <FlowWire from={{ x: 464, y: 68 }} to={{ x: 280, y: 158 }} color={optionColor} />
        {/* Command → ban action → reply, straight down the spine. */}
        <FlowWire from={{ x: 280, y: 220 }} to={{ x: 260, y: 318 }} color={entryColor} />
        <FlowWire from={{ x: 260, y: 382 }} to={{ x: 298, y: 470 }} color={actionColor} />
      </svg>

      <Node x={4} y={10} w={184} delay={0}>
        <FlowBlock
          color={optionColor}
          tag="Tham số"
          icon={<User className={icon} />}
          title="user"
          description="Người cần cấm"
          handles={["bottom"]}
        />
      </Node>

      <Node x={372} y={10} w={184} delay={1.1}>
        <FlowBlock
          color={optionColor}
          tag="Tham số"
          icon={<AlignLeft className={icon} />}
          title="reason"
          description="Lý do cấm"
          handles={["bottom"]}
        />
      </Node>

      <Node x={168} y={158} w={224} delay={0.5}>
        <FlowBlock
          color={entryColor}
          tag="Lệnh"
          icon={<SquareSlash className={icon} />}
          title="/ban"
          description="Cấm một người dùng"
          handles={["top", "bottom"]}
          glow
        />
      </Node>

      <Node x={148} y={318} w={224} delay={1.6}>
        <FlowBlock
          color={actionColor}
          tag="Hành động"
          icon={<Ban className={icon} />}
          title="Cấm thành viên"
          description="Xoá người dùng khỏi server"
          handles={["top", "bottom"]}
        />
      </Node>

      <Node x={186} y={470} w={224} delay={0.9}>
        <FlowBlock
          color={actionColor}
          tag="Phản hồi"
          icon={<Reply className={icon} />}
          title="Trả lời lệnh"
          description="“Đã cấm người dùng.”"
          handles={["top"]}
          glow
        />
      </Node>
    </div>
  );
}
