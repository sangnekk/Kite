import HomeLayout from "@/components/home/HomeLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileSearchIcon,
  FolderSearchIcon,
  ImageIcon,
  MailPlusIcon,
  PaletteIcon,
  SearchIcon,
  SnowflakeIcon,
  UserSearchIcon,
  WebhookIcon,
} from "lucide-react";
import Link from "next/link";

const tools = [
  {
    title: "Tạo tin nhắn",
    description:
      "Tạo tin nhắn Discord đẹp mắt và gửi chúng qua webhook.",
    icon: MailPlusIcon,
    href: "https://message.style/app",
    target: "_blank",
  },
  {
    title: "Văn bản màu",
    description:
      "Tạo văn bản màu mà bạn có thể sử dụng trong tin nhắn Discord.",
    icon: PaletteIcon,
    href: "https://message.style/app/tools/colored-text",
    target: "_blank",
  },
  {
    title: "Liên kết nhúng",
    description:
      "Tạo liên kết nhúng cho tin nhắn Discord với tiêu đề, mô tả và hình ảnh tùy chỉnh.",
    icon: ImageIcon,
    href: "https://message.style/app/tools/embed-links",
    target: "_blank",
  },
  {
    title: "Giải mã Snowflake",
    description: "Xem thông tin chung về một ID Discord.",
    icon: SnowflakeIcon,
    href: "https://dis.wtf/lookup/snowflake",
    target: "_blank",
  },
  {
    title: "Tra cứu người dùng",
    description:
      "Xem thông tin về người dùng Discord bằng cách nhập ID người dùng.",
    icon: UserSearchIcon,
    href: "https://dis.wtf/lookup/user",
    target: "_blank",
  },
  {
    title: "Tra cứu server",
    description:
      "Xem thông tin về server Discord bằng cách nhập ID server.",
    icon: FolderSearchIcon,
    href: "https://dis.wtf/lookup/guild",
    target: "_blank",
  },
  {
    title: "Tra cứu lời mời",
    description:
      "Xem thông tin về server Discord bằng cách nhập mã lời mời.",
    icon: FolderSearchIcon,
    href: "https://dis.wtf/lookup/invite",
    target: "_blank",
  },
  {
    title: "Tra cứu ứng dụng",
    description:
      "Xem thông tin về ứng dụng Discord bằng cách nhập ID ứng dụng.",
    icon: FileSearchIcon,
    href: "https://dis.wtf/lookup/app",
    target: "_blank",
  },
  {
    title: "Thông tin Webhook",
    description: "Xem thông tin về webhook Discord từ URL webhook.",
    icon: WebhookIcon,
    href: "/tools/webhook-info",
  },
];

export default function ToolsPage() {
  return (
    <HomeLayout title="Công cụ">
      <div className="py-20 px-5 max-w-4xl mx-auto">
        <div className="flex flex-col space-y-2 mb-10">
          <h1 className="text-3xl font-semibold leading-none tracking-tight">
            Công cụ Discord
          </h1>
          <p className="text-sm text-muted-foreground">
            Bộ sưu tập các công cụ hữu ích liên quan đến hệ sinh thái Discord và Vibe Bot.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {tools.map((tool, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="flex space-x-3">
                    <tool.icon className="w-6 h-6 text-muted-foreground" />
                    <div>{tool.title}</div>
                  </CardTitle>
                  <Button variant="outline" asChild className="lg:mb-2">
                    <Link href={tool.href} target={tool.target}>
                      Mở công cụ
                    </Link>
                  </Button>
                </div>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </HomeLayout>
  );
}
