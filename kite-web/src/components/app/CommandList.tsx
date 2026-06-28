import { Button } from "../ui/button";
import CommandListEntry from "./CommandListEntry";
import AppEmptyPlaceholder from "./AppEmptyPlaceholder";
import { Skeleton } from "../ui/skeleton";
import AutoAnimate from "../common/AutoAnimate";
import CommandCreateDialog from "./CommandCreateDialog";
import { useCommands } from "@/lib/hooks/api";
import { CommandDeployDialog } from "./CommandDeployDialog";
import { useCommandsDeployMutation } from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function CommandList() {
  const commands = useCommands();
  const appId = useAppId();

  const cmdCreateButton = (
    <CommandCreateDialog>
      <Button>Tạo lệnh</Button>
    </CommandCreateDialog>
  );

  // Deleting a command leaves no row behind, so the remaining commands all look
  // "deployed" and the deploy button would stay disabled — the deleted command
  // would keep working in Discord. Track that a delete happened since the last
  // deploy so the button lights up (and, when nothing is left, auto-sync).
  const [deletedSinceDeploy, setDeletedSinceDeploy] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);

  const deployMutation = useCommandsDeployMutation(appId);
  const autoSyncedRef = useRef(false);

  const hasUndeployedCommands = commands?.some(
    (command) =>
      new Date(command!.updated_at) > new Date(command!.last_deployed_at || 0)
  );

  // When the last command is deleted there is no command card to host the deploy
  // button, so reconcile Discord automatically by calling the deploy endpoint.
  useEffect(() => {
    if (!commands) return;

    if (commands.length > 0) {
      autoSyncedRef.current = false;
      return;
    }

    if (deletedSinceDeploy && !autoSyncedRef.current) {
      autoSyncedRef.current = true;
      setDeletedSinceDeploy(false);
      deployMutation.mutate(undefined, {
        onSuccess(res) {
          if (res.success && res.data.deployed) {
            toast.success("Đã gỡ toàn bộ lệnh khỏi Discord.");
          }
        },
      });
    }
  }, [commands, deletedSinceDeploy, deployMutation]);

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
            <CommandListEntry
              command={command!}
              key={i}
              onDeleted={() => setDeletedSinceDeploy(true)}
            />
          ))}

          <div className="flex gap-5 justify-between flex-col md:flex-row">
            {cmdCreateButton}

            <CommandDeployDialog
              open={deployDialogOpen}
              onOpenChange={setDeployDialogOpen}
              onDeployed={() => setDeletedSinceDeploy(false)}
            >
              <Button
                disabled={!hasUndeployedCommands && !deletedSinceDeploy}
                variant="destructive"
              >
                Triển khai tất cả lệnh
              </Button>
            </CommandDeployDialog>
          </div>
        </>
      )}
    </AutoAnimate>
  );
}
