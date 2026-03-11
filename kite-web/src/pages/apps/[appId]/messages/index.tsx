import AppLayout from "@/components/app/AppLayout";
import MessageList from "@/components/app/MessageList";
import { Separator } from "@/components/ui/separator";
import env from "@/lib/env/client";

const breadcrumbs = [
  {
    label: "Mẫu tin nhắn",
  },
];

export default function AppMessagesPage() {
  return (
    <AppLayout title="Mẫu tin nhắn" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">
          Mẫu tin nhắn
        </h1>
        <p className="text-muted-foreground text-sm">
          Tạo mẫu tin nhắn có thể dùng làm phản hồi cho lệnh và sự kiện
          trong ứng dụng.{" "}
          <a
            href={`${env.NEXT_PUBLIC_DOCS_LINK}/reference/message`}
            target="_blank"
            className="text-primary hover:underline"
          >
            Tìm hiểu thêm
          </a>
        </p>
      </div>
      <Separator className="my-8" />
      <MessageList />
    </AppLayout>
  );
}
