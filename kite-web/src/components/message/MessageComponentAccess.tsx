import { useMemo } from "react";
import { ChevronDownIcon } from "lucide-react";
import { MessageComponentAccess as Access } from "@/lib/message/schema";
import {
  decodePermissionsBitset,
  encodePermissionsBitset,
  permissionBits,
} from "@/lib/discord/permissions";
import { useValidationErrors } from "@/lib/message/state";
import MessageInput from "./MessageInput";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Label } from "../ui/label";

const modeOptions = [
  { value: "everyone", label: "Mọi người" },
  { value: "roles", label: "Người có vai trò nhất định" },
  { value: "permissions", label: "Người có quyền nhất định" },
  { value: "invoker", label: "Chỉ người đã kích hoạt luồng" },
];

// MessageComponentAccess configures who can use a button or select menu. The
// rule is enforced by the bot before any action of the component runs.
export default function MessageComponentAccess({
  access,
  onChange,
  validationPath,
  sentByFlow,
}: {
  access: Access | undefined;
  onChange: (access: Access | undefined) => void;
  validationPath: string;
  // Whether the message is sent by a flow; "invoker" only applies then.
  sentByFlow?: boolean;
}) {
  const mode = access?.mode ?? "everyone";
  const roleError = useValidationErrors(
    (s) => s.getIssueByPath(`${validationPath}.role_ids`)?.message
  );
  const permissionError = useValidationErrors(
    (s) => s.getIssueByPath(`${validationPath}.permissions`)?.message
  );

  const enabledPermissions = useMemo(
    () =>
      decodePermissionsBitset(access?.permissions || "0").map((p) =>
        p.bit.toString()
      ),
    [access?.permissions]
  );

  const setMode = (v: string) => {
    if (v === "everyone") {
      onChange(undefined);
      return;
    }
    onChange({ deny_message: access?.deny_message, mode: v as Access["mode"] });
  };

  return (
    <div className="space-y-3">
      <MessageInput
        type="select"
        label="Ai được dùng?"
        description="Người không đủ điều kiện sẽ nhận một tin nhắn chỉ họ thấy và không hành động nào được chạy."
        value={mode}
        options={modeOptions.filter((o) => sentByFlow || o.value !== "invoker")}
        placeholder="Chọn"
        onChange={setMode}
        validationPath={`${validationPath}.mode`}
      />

      {mode === "roles" && (
        <MessageInput
          type="text"
          label="ID vai trò được phép"
          description="Nhập ID vai trò, cách nhau bằng dấu phẩy. Người dùng chỉ cần có một trong các vai trò."
          value={(access?.role_ids ?? []).join(", ")}
          onChange={(v) =>
            onChange({
              ...access!,
              role_ids: v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          validationPath={`${validationPath}.role_ids`}
        />
      )}
      {mode === "roles" && roleError && (
        <div className="text-sm text-red-500">{roleError}</div>
      )}

      {mode === "permissions" && (
        <div className="space-y-1">
          <Label className="text-base">Quyền bắt buộc</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full flex items-center">
                <div>Đã chọn {enabledPermissions.length} quyền</div>
                <ChevronDownIcon className="h-4 w-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 max-h-[320px] overflow-y-auto">
              {permissionBits.map((p) => (
                <DropdownMenuCheckboxItem
                  key={p.bit}
                  checked={enabledPermissions.includes(p.bit.toString())}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...enabledPermissions, p.bit.toString()]
                      : enabledPermissions.filter((b) => b !== p.bit.toString());
                    onChange({
                      ...access!,
                      permissions: encodePermissionsBitset(
                        next.map((b) => parseInt(b))
                      ),
                    });
                  }}
                >
                  {p.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {permissionError && (
            <div className="text-sm text-red-500">{permissionError}</div>
          )}
        </div>
      )}

      {mode !== "everyone" && (
        <MessageInput
          type="text"
          label="Tin nhắn từ chối"
          description="Để trống để dùng: 'Bạn không có quyền sử dụng thành phần này.'"
          value={access?.deny_message ?? ""}
          maxLength={2000}
          onChange={(v) => onChange({ ...access!, deny_message: v || undefined })}
          validationPath={`${validationPath}.deny_message`}
          placeholders
        />
      )}
    </div>
  );
}
