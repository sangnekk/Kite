import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MessageWebhookFields() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tùy chọn Webhook</CardTitle>
        <CardDescription>
          Đặt URL webhook nơi bạn muốn gửi tin nhắn và các thông tin khác.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <div className="space-y-1">
            <Label>URL Webhook</Label>
            <Input type="url" />
          </div>
          <div className="flex space-x-3">
            <div className="space-y-1 w-full">
              <Label>ID luồng</Label>
              <Input type="url" />
            </div>
            <div className="space-y-1 w-full">
              <Label>ID tin nhắn</Label>
              <Input type="url" />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button>Gửi tin nhắn</Button>
      </CardFooter>
    </Card>
  );
}
