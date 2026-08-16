import { useApp } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  ShieldAlertIcon,
  XIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import { useMemo, useState } from "react";

interface DisabledInfo {
  title: string;
  description: string;
  solution?: string;
  action?: {
    label: string;
    href: string;
    external?: boolean;
  };
}

function parseDisabledReason(reason: string, appId?: string): DisabledInfo {
  const lower = reason.toLowerCase();

  // 1. 4004 Authentication Failed / Token Invalid
  if (
    lower.includes("4004") ||
    lower.includes("authentication failed") ||
    lower.includes("token is invalid") ||
    lower.includes("unauthorized")
  ) {
    return {
      title: "Token Bot không hợp lệ hoặc đã hết hạn",
      description:
        "Discord từ chối kết nối vì Token của bot không chính xác, đã bị làm mới (Reset) hoặc bị thu hồi.",
      solution:
        "Vui lòng lấy Token mới tại Discord Developer Portal và cập nhật lại trong mục Cài đặt.",
      action: appId
        ? {
            label: "Cập nhật Token",
            href: `/apps/${appId}/settings`,
          }
        : undefined,
    };
  }

  // 2. 4013 / 4014 Intents missing
  if (
    lower.includes("4013") ||
    lower.includes("4014") ||
    lower.includes("disallowed intent") ||
    lower.includes("invalid intent") ||
    lower.includes("intent")
  ) {
    return {
      title: "Chưa bật quyền Gateway Intent trên Discord",
      description:
        "Bot đang yêu cầu các quyền đặc biệt (như đọc tin nhắn, danh sách thành viên) nhưng chưa được bật trong Developer Portal.",
      solution:
        "Truy cập Discord Developer Portal > Bot > Bật các mục 'Privileged Gateway Intents' (Presence, Server Members, Message Content).",
      action: {
        label: "Mở Discord Portal",
        href: "https://discord.com/developers/applications",
        external: true,
      },
    };
  }

  // 3. 4011 Sharding Required
  if (lower.includes("4011") || lower.includes("sharding required")) {
    return {
      title: "Yêu cầu cấu hình Sharding",
      description:
        "Bot đã tham gia hơn 2.500 máy chủ, Discord yêu cầu phân mảnh kết nối (Sharding) để tiếp tục hoạt động.",
      solution: "Vui lòng liên hệ quản trị viên để được hỗ trợ nâng cấp kết nối bot.",
    };
  }

  // 4. 4005 Already Authenticated
  if (lower.includes("4005") || lower.includes("already authenticated")) {
    return {
      title: "Bot đang chạy ở nơi khác",
      description:
        "Token của bot này đang được sử dụng bởi một phiên làm việc khác.",
      solution:
        "Vui lòng tắt phiên chạy còn lại hoặc tạo lại Token mới để tránh xung đột.",
    };
  }

  // 5. 4008 Rate Limited
  if (lower.includes("4008") || lower.includes("rate limit")) {
    return {
      title: "Tạm thời bị giới hạn kết nối",
      description:
        "Bot vừa gửi quá nhiều yêu cầu kết nối trong thời gian ngắn và bị Discord tạm dừng.",
      solution: "Vui lòng đợi vài phút rồi thử bật lại bot trong Cài đặt.",
      action: appId
        ? {
            label: "Đi tới Cài đặt",
            href: `/apps/${appId}/settings`,
          }
        : undefined,
    };
  }

  // 6. Max Guilds Exceeded
  if (
    lower.includes("more than") &&
    lower.includes("servers are currently not supported")
  ) {
    return {
      title: "Vượt quá giới hạn số máy chủ",
      description:
        "Bot đang có mặt trong nhiều máy chủ hơn hạn mức cho phép của gói tài khoản.",
      solution:
        "Bạn có thể mời bot rời bớt máy chủ không dùng đến hoặc nâng cấp gói dịch vụ.",
      action: appId
        ? {
            label: "Nâng cấp gói",
            href: `/apps/${appId}/premium`,
          }
        : undefined,
    };
  }

  // 7. Credits
  if (
    lower.includes("no credits") ||
    lower.includes("credits remaining") ||
    lower.includes("credit")
  ) {
    return {
      title: "Đã sử dụng hết số dư tín dụng",
      description:
        "Tài khoản của bạn đã sử dụng hết hạn mức credit để duy trì bot hoạt động.",
      solution: "Vui lòng nạp thêm credit hoặc nâng cấp gói để tiếp tục sử dụng.",
      action: appId
        ? {
            label: "Nạp thêm credit",
            href: `/apps/${appId}/premium`,
          }
        : undefined,
    };
  }

  // 8. Admin disabled
  if (lower.includes("quản trị viên") || lower.includes("admin")) {
    return {
      title: "Tạm ngưng bởi Quản trị viên",
      description: "Ứng dụng này đã bị quản trị viên hệ thống tạm ngưng hoạt động.",
      solution: "Vui lòng liên hệ hỗ trợ nếu bạn cần mở lại bot.",
    };
  }

  // Default fallback for any other error / websocket failure
  return {
    title: "Không thể kết nối đến Discord",
    description:
      "Hệ thống gặp sự cố khi kết nối tới máy chủ Discord (có thể do đường truyền hoặc Discord đang bảo trì).",
    solution: "Vui lòng thử khởi động lại bot trong Cài đặt.",
    action: appId
      ? {
          label: "Đi tới Cài đặt",
          href: `/apps/${appId}/settings`,
        }
      : undefined,
  };
}

export default function AppDisabledPopup() {
  const app = useApp();
  const appId = useAppId();
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const disabledInfo = useMemo(() => {
    if (!app?.disabled_reason) return null;
    return parseDisabledReason(app.disabled_reason, appId);
  }, [app?.disabled_reason, appId]);

  if (app?.enabled || !app?.disabled_reason || dismissed || !disabledInfo) {
    return null;
  }

  const handleCopyRaw = () => {
    if (app.disabled_reason) {
      navigator.clipboard.writeText(app.disabled_reason);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="shadow-xl max-w-[420px] fixed top-5 right-5 ml-5 z-50 border-destructive/40 bg-card text-card-foreground animate-in fade-in slide-in-from-top-2 duration-200">
      <CardHeader className="px-5 pt-4 pb-2 relative">
        <div className="flex items-start justify-between gap-2 pr-6">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="w-4 h-4 shrink-0" />
            <span>{disabledInfo.title}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setDismissed(true)}
            title="Đóng thông báo"
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-2 space-y-2.5 text-xs">
        <p className="text-muted-foreground leading-relaxed">
          {disabledInfo.description}
        </p>

        {disabledInfo.solution && (
          <div className="rounded-md bg-muted/60 p-2.5 border border-border/50 text-foreground">
            <span className="font-medium text-foreground block mb-0.5">
              💡 Cách khắc phục:
            </span>
            <span className="text-muted-foreground leading-relaxed">
              {disabledInfo.solution}
            </span>
          </div>
        )}

        {/* Collapsible raw developer details */}
        <div className="pt-1">
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <ChevronUpIcon className="w-3.5 h-3.5" />
            ) : (
              <ChevronDownIcon className="w-3.5 h-3.5" />
            )}
            <span>
              {showDetails
                ? "Ẩn chi tiết kỹ thuật"
                : "Chi tiết lỗi kỹ thuật (dành cho Dev)"}
            </span>
          </button>

          {showDetails && (
            <div className="mt-1.5 p-2 rounded bg-muted font-mono text-[11px] break-all select-all text-muted-foreground relative group border border-border/40">
              <p>{app.disabled_reason}</p>
              <Button
                variant="outline"
                size="icon"
                className="h-5 w-5 absolute top-1.5 right-1.5 opacity-80 hover:opacity-100"
                onClick={handleCopyRaw}
                title="Sao chép lỗi"
              >
                {copied ? (
                  <CheckIcon className="w-3 h-3 text-green-500" />
                ) : (
                  <CopyIcon className="w-3 h-3" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-5 pt-1 pb-4 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={() => setDismissed(true)}
        >
          Để sau
        </Button>

        {disabledInfo.action && (
          <Button size="sm" className="h-8 text-xs gap-1.5" asChild>
            {disabledInfo.action.external ? (
              <a
                href={disabledInfo.action.href}
                target="_blank"
                rel="noreferrer"
              >
                <span>{disabledInfo.action.label}</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            ) : (
              <Link href={disabledInfo.action.href}>
                <span>{disabledInfo.action.label}</span>
              </Link>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

