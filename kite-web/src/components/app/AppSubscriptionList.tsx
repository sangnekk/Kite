import { useAppSubscriptions } from "@/lib/hooks/api";
import AppSubscriptionListEntry from "./AppSubscriptionListEntry";

export default function AppSubscriptionList() {
  const subscriptions = useAppSubscriptions();

  if (subscriptions?.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto mt-16 max-w-5xl sm:mt-20">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          Lịch sử đăng ký
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi trạng thái và quản lý các gói đã kích hoạt cho ứng dụng.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {subscriptions?.map((sub) => (
          <AppSubscriptionListEntry key={sub!.id} subscription={sub!} />
        ))}
      </div>
    </section>
  );
}
