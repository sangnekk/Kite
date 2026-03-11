import * as React from "react";
import Link from "next/link";
import logo from "@/assets/logo/orange@1024.png";
import env from "@/lib/env/client";

import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { PlusCircleIcon } from "lucide-react";

const tools = [
  {
    title: "Tạo tin nhắn",
    href: "https://message.style/app",
    description:
      "Tạo tin nhắn Discord đẹp mắt và gửi chúng qua webhook!",
    target: "_blank",
  },
  {
    title: "Văn bản màu",
    href: "https://message.style/app/tools/colored-text",
    description:
      "Tạo văn bản màu mà bạn có thể sử dụng trong tin nhắn Discord.",
    target: "_blank",
  },
  {
    title: "Liên kết nhúng",
    href: "https://message.style/app/tools/embed-links",
    description:
      "Tạo liên kết nhúng cho tin nhắn Discord với tiêu đề, mô tả và hình ảnh tùy chỉnh.",
    target: "_blank",
  },
  {
    title: "Tra cứu người dùng",
    href: "https://dis.wtf/lookup/user",
    description:
      "Xem thông tin về người dùng Discord bằng cách nhập ID người dùng.",
    target: "_blank",
  },
  {
    title: "Thông tin Webhook",
    href: "/tools/webhook-info",
    description: "Xem thông tin về webhook Discord từ URL webhook.",
  },
];

export default function HomeNavbarMenu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <img
              src={logo.src}
              className="h-6 w-6 mr-2 hidden sm:block"
              alt=""
            />
            Vibe Bot
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 w-[80dvw] md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3">
                <Link href="/" legacyBehavior passHref>
                  <NavigationMenuLink asChild>
                    <div
                      role="button"
                      className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                    >
                      <img src={logo.src} className="h-10 w-10" alt="" />
                      <div className="my-2 text-lg font-medium">Vibe Bot</div>
                      <p className="text-sm leading-tight text-muted-foreground">
                        Tạo bot Discord tùy chỉnh dễ dàng.
                      </p>
                    </div>
                  </NavigationMenuLink>
                </Link>
              </li>
              <ListItem href="/#features" title="Tính năng">
                Tìm hiểu về các tính năng của Vibe Bot và cách sử dụng chúng.
              </ListItem>
              <ListItem href="/#flow" title="Lập trình trực quan">
                Xem cách bạn có thể tạo bot Discord mà không cần viết code.
              </ListItem>
              <ListItem href="/#faq" title="Câu hỏi thường gặp">
                Nhận câu trả lời cho các câu hỏi phổ biến về Vibe Bot.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Công cụ</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 w-[80dvw] md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              {tools.map((tool) => (
                <ListItem
                  key={tool.title}
                  title={tool.title}
                  href={tool.href}
                  target={tool.target}
                >
                  {tool.description}
                </ListItem>
              ))}
              <li>
                <Link href="/tools" legacyBehavior passHref>
                  <NavigationMenuLink asChild>
                    <div className="cursor-pointer flex items-center space-x-4 select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                      <PlusCircleIcon className="h-8 w-8 inline-block flex-none text-muted-foreground" />
                      <div className="space-y-1">
                        <div className="text-sm font-medium leading-none">
                          Xem thêm
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Xem tất cả các công cụ có sẵn trên Vibe Bot, bao gồm cả
                          những công cụ không được liệt kê ở đây.
                        </p>
                      </div>
                    </div>
                  </NavigationMenuLink>
                </Link>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem className="hidden sm:block">
          <NavigationMenuLink
            href={env.NEXT_PUBLIC_DOCS_LINK}
            target="_blank"
            className={navigationMenuTriggerStyle()}
          >
            Tài liệu
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const ListItem = ({
  className,
  title,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link>) => {
  return (
    <li>
      <Link {...props} passHref>
        <NavigationMenuLink asChild>
          <div
            className={cn(
              "cursor-pointer block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              className
            )}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          </div>
        </NavigationMenuLink>
      </Link>
    </li>
  );
};
ListItem.displayName = "ListItem";
