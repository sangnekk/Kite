import {
  CheckIcon,
  CopyPlusIcon,
  EllipsisIcon,
  MailIcon,
  Trash2Icon,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { useRouter } from "next/router";
import Link from "next/link";
import { Message } from "@/lib/types/wire.gen";
import ConfirmDialog from "../common/ConfirmDialog";
import { useAppId } from "@/lib/hooks/params";
import { toast } from "sonner";
import { useMessageDeleteMutation } from "@/lib/api/mutations";
import { formatDateTime } from "@/lib/utils";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import MessageDuplicateDialog from "./MessageDuplicateDialog";

export default function MessageListEntry({ message }: { message: Message }) {
  const router = useRouter();

  const deleteMutation = useMessageDeleteMutation(useAppId(), message.id);

  function remove() {
    deleteMutation.mutate(undefined, {
      onSuccess(res) {
        if (res.success) {
          toast.success("Đã xóa mẫu tin nhắn!");
        } else {
          toast.error(
            `Xóa mẫu tin nhắn thất bại: ${res.error.message} (${res.error.code})`
          );
        }
      },
    });
  }

  return (
    <Card>
      <div className="float-right pt-3 pr-4">
        <div className="flex items-center space-x-2">
          <CheckIcon className="h-5 w-5 text-green-500" />
          <div className="text-sm text-muted-foreground">
            {formatDateTime(new Date(message.updated_at))}
          </div>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-base flex items-center space-x-2">
          <MailIcon className="h-5 w-5 text-muted-foreground" />
          <div>{message.name}</div>
        </CardTitle>
        <CardDescription className="text-sm">
          {message.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex space-x-3">
        <Button size="sm" variant="outline" asChild>
          <Link
            href={{
              pathname: "/apps/[appId]/messages/[messageId]",
              query: {
                appId: router.query.appId,
                messageId: message.id,
              },
            }}
          >
            Quản lý
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <EllipsisIcon className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <ConfirmDialog
                title="Bạn có chắc chắn muốn xóa tin nhắn này?"
                description="Điều này sẽ xóa tin nhắn khỏi ứng dụng và không thể hoàn tác."
                onConfirm={remove}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Trash2Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  Xóa tin nhắn
                </DropdownMenuItem>
              </ConfirmDialog>
              <MessageDuplicateDialog message={message}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <CopyPlusIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  Nhân đôi tin nhắn
                </DropdownMenuItem>
              </MessageDuplicateDialog>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
