import { Subscription } from "@/lib/types/wire.gen";
import { Badge } from "../ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

export default function AppSubscriptionListEntry({
  subscription,
}: {
  subscription: Subscription;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <CardTitle className="text-xl mb-1">
              {subscription.display_name}
            </CardTitle>
            <CardDescription>
              {new Date(subscription.created_at).toLocaleDateString()}
              {subscription.ends_at
                ? ` - ${new Date(subscription.ends_at).toLocaleDateString()}`
                : " - gia hạn vào " +
                  new Date(subscription.renews_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <div>
            <Badge
              variant={subscription.status !== "ended" ? "default" : "outline"}
            >
              {subscription.status_formatted}
            </Badge>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
