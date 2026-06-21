import AppAIStudio from "@/components/app/AppAIStudio";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { AI_FEATURES_ENABLED } from "@/lib/ai/featureFlags";
import { useAppFeature } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import Link from "next/link";

const breadcrumbs = [{ label: "Trợ lý AI" }];

export default function AppAIPage() {
  const appId = useAppId();
  const featureIncluded = useAppFeature((f) => f.ai_included);
  const aiIncluded = AI_FEATURES_ENABLED && featureIncluded;

  return (
    <AppLayout title="Trợ lý AI" breadcrumbs={breadcrumbs}>
      {aiIncluded === false ? (
        <div className="rounded-lg border border-border bg-background p-8 text-center">
          <h1 className="mb-2 text-lg font-semibold">Trợ lý AI</h1>
          <p className="mx-auto mb-4 max-w-md text-sm text-muted-foreground">
            Trợ lý AI chỉ khả dụng ở các gói có bật tính năng này. Nâng cấp để AI
            giúp bạn tạo lệnh, sự kiện và mẫu tin nhắn bằng trò chuyện.
          </p>
          <Button asChild>
            <Link href={{ pathname: "/apps/[appId]/premium", query: { appId } }}>
              Nâng cấp gói
            </Link>
          </Button>
        </div>
      ) : (
        <div className="h-[calc(100dvh-8rem)] overflow-hidden rounded-lg border border-border bg-background sm:h-[calc(100dvh-9rem)]">
          <AppAIStudio />
        </div>
      )}
    </AppLayout>
  );
}
