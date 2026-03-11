import { Button } from "../ui/button";
import CommandListEntry from "./CommandListEntry";
import AppEmptyPlaceholder from "./AppEmptyPlaceholder";
import { Skeleton } from "../ui/skeleton";
import AutoAnimate from "../common/AutoAnimate";
import CommandCreateDialog from "./CommandCreateDialog";
import { useCommands } from "@/lib/hooks/api";
import { CommandDeployDialog } from "./CommandDeployDialog";
import { useState } from "react";

export default function CommandList() {
  const commands = useCommands();

  const cmdCreateButton = (
    <CommandCreateDialog>
      <Button>Tạo lệnh</Button>
    </CommandCreateDialog>
  );

  const hasUndeployedCommands = commands?.some(
    (command) =>
      new Date(command!.updated_at) > new Date(command!.last_deployed_at || 0)
  );

  const [deployDialogOpen, setDeployDialogOpen] = useState(false);

  return (
    <AutoAnimate className="flex flex-col md:flex-1 space-y-5">
      {!commands ? (
        <>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </>
      ) : commands.length === 0 ? (
        <AppEmptyPlaceholder
          title="Chưa có lệnh nào"
          description="Bạn có thể bắt đầu bằng cách tạo lệnh đầu tiên!"
          action={cmdCreateButton}
        />
      ) : (
        <>
          {commands.map((command, i) => (
            <CommandListEntry command={command!} key={i} />
          ))}

          <div className="flex gap-5 justify-between flex-col md:flex-row">
            {cmdCreateButton}

            <CommandDeployDialog
              open={deployDialogOpen}
              onOpenChange={setDeployDialogOpen}
            >
              <Button disabled={!hasUndeployedCommands} variant="destructive">
                Triển khai tất cả lệnh
              </Button>
            </CommandDeployDialog>
          </div>
        </>
      )}
    </AutoAnimate>
  );
}
