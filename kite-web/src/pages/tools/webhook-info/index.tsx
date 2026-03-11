import ToolLayout from "@/tools/common/components/ToolLayout";
import WebhookInfoTool from "@/tools/webhook-info/components/WebhookInfoTool";

export default function WebhookInfoPage() {
  return (
    <ToolLayout
      title="Thông tin Webhook"
      description="Xem thông tin về webhook Discord từ URL webhook. Dán URL webhook của bạn bên dưới để bắt đầu!"
    >
      <WebhookInfoTool />
    </ToolLayout>
  );
}
