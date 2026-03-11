import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppCollaboratorDeleteMutation } from "@/lib/api/mutations";
import { useAppCollaborators, useAppFeature } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import { MinusIcon } from "lucide-react";
import ConfirmDialog from "../common/ConfirmDialog";
import { Button } from "../ui/button";
import AppCollaboratorAddDialog from "./AppCollaboratorAddDialog";
import { toast } from "sonner";

export default function AppSettingsCollaborators() {
  const appId = useAppId();
  const collaborators = useAppCollaborators();

  const maxCollaborators = useAppFeature((f) => f.max_collaborators) || 0;
  const currentCollaborators = collaborators?.length || 0;

  const deleteMutation = useAppCollaboratorDeleteMutation(appId);

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-3">
          <CardTitle>Cộng tác viên</CardTitle>
          <div className="text-muted-foreground">
            {currentCollaborators} / {maxCollaborators}
          </div>
        </div>
        <CardDescription>
          Thêm hoặc xóa người dùng khác có thể quản lý ứng dụng này.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="mb-5">
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Discord ID</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collaborators?.map((collaborator) => (
              <TableRow key={collaborator!.user.id}>
                <TableCell className="font-medium">
                  {collaborator!.user.display_name}
                </TableCell>
                <TableCell>{collaborator!.user.discord_id}</TableCell>
                <TableCell>{collaborator!.role}</TableCell>
                <TableCell className="text-right">
                  {collaborator!.role !== "owner" && (
                    <ConfirmDialog
                      title="Xóa cộng tác viên"
                      description="Bạn có chắc chắn muốn xóa cộng tác viên này?"
                      onConfirm={() => {
                        deleteMutation.mutate(collaborator!.user.id, {
                          onSuccess: (res) => {
                            if (!res.success) {
                              toast.error(
                                `Xóa cộng tác viên thất bại: ${res.error.message} (${res.error.code})`
                              );
                            }
                          },
                        });
                      }}
                    >
                      <Button variant="ghost" size="icon">
                        <MinusIcon className="h-5 w-5" />
                      </Button>
                    </ConfirmDialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <AppCollaboratorAddDialog>
          <Button
            variant="outline"
            disabled={currentCollaborators >= maxCollaborators}
          >
            Thêm cộng tác viên
          </Button>
        </AppCollaboratorAddDialog>
      </CardContent>
    </Card>
  );
}
