import AppLayout from "@/components/app/AppLayout";
import AppSubscriptionList from "@/components/app/AppSubscriptionList";
import AppPricingList from "@/components/app/AppPricingList";
import { Badge } from "@/components/ui/badge";
import {
  BotIcon,
  DatabaseIcon,
  SparklesIcon,
  WorkflowIcon,
} from "lucide-react";

const breadcrumbs = [
  {
    label: "Premium",
  },
];

export default function AppPremiumPage() {
  return (
    <AppLayout title="Premium" breadcrumbs={breadcrumbs}>
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-7 shadow-sm sm:px-8 sm:py-9 lg:px-10">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-24 size-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-primary/5 blur-3xl"
        />

        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
          <div className="flex max-w-2xl flex-col items-start gap-5">
            <Badge variant="secondary" className="gap-1.5 text-primary">
              <SparklesIcon data-icon="inline-start" className="size-3.5" />
              Vibe Bot Premium
            </Badge>

            <div className="flex flex-col gap-3">
              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Thêm dư địa cho những flow đang lớn.
              </h1>
              <p className="max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
                Mở rộng credit, cộng tác viên, dữ liệu và tự động hóa cho ứng
                dụng này. Mọi flow và cấu hình hiện tại vẫn được giữ nguyên khi
                bạn nâng cấp.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground sm:text-sm">
              <span className="rounded-full border bg-background/70 px-3 py-1.5">
                Nâng cấp ngay trên dashboard
              </span>
              <span className="rounded-full border bg-background/70 px-3 py-1.5">
                Theo dõi gói trong một nơi
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Capacity flow
                </p>
                <p className="mt-1 text-sm font-semibold">
                  Từ ý tưởng đến vận hành
                </p>
              </div>
              <span aria-hidden="true" className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-40 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
              <FlowStep icon={WorkflowIcon} label="Trigger" />
              <div className="h-px w-full bg-border" />
              <FlowStep icon={DatabaseIcon} label="Data" />
              <div className="h-px w-full bg-border" />
              <FlowStep icon={BotIcon} label="Scale" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-9 max-w-5xl text-center sm:mt-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Gói dành cho ứng dụng này
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Chọn mức dung lượng phù hợp
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          So sánh trực tiếp giới hạn vận hành và những khả năng nâng cao của
          từng gói.
        </p>
      </div>

      <div className="mt-6 sm:mt-8">
        <AppPricingList />
      </div>

      <AppSubscriptionList />
    </AppLayout>
  );
}

function FlowStep({
  icon: Icon,
  label,
}: {
  icon: typeof WorkflowIcon;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 rounded-xl border bg-card px-2 py-3 shadow-sm">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="truncate text-xs font-medium">{label}</span>
    </div>
  );
}
