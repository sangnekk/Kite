import {
  decodePermissionsBitset,
  encodePermissionsBitset,
  permissionBits,
} from "@/lib/discord/permissions";
import { getNodeId, useNodeValues } from "@/lib/flow/nodes";
import { useMessages, useVariables } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import {
  CommandArgumentChoiceData,
  EmojiData,
  HTTPRequestData,
  ModalComponentData,
  PermissionOverwriteData,
} from "@/lib/types/flow.gen";
import { Node, useNodes, useReactFlow, useStoreApi } from "@xyflow/react";
import {
  ChevronDownIcon,
  CircleAlertIcon,
  CopyIcon,
  HelpCircleIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  SmileIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { NodeData, NodeProps } from "../../lib/flow/dataSchema";
import MessageCreateDialog from "../app/MessageCreateDialog";
import VariableCreateDialog from "../app/VariableCreateDialog";
import EmojiPicker from "../common/EmojiPicker";
import JsonEditor from "../common/JsonEditor";
import PlaceholderInput from "../common/PlaceholderInput";
import Twemoji from "../common/Twemoji";
import MessageEditorDialog from "../message/MessageEditorDialog";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import FlowPlaceholderExplorer from "./FlowPlaceholderExplorer";
import env from "@/lib/env/client";
import { ScrollArea } from "../ui/scroll-area";

interface Props {
  nodeId: string;
}

interface InputProps {
  id: string;
  type: string;
  data: NodeData;
  updateData: (newData: Partial<NodeData>) => void;
  errors: Record<string, string>;
}

const intputs: Record<string, any> = {
  custom_label: CustomLabelInput,
  temporary_name: TemporaryNameInput,
  name: NameInput,
  description: DescriptionInput,
  command_argument_type: CommandArgumentTypeInput,
  command_argument_required: CommandArgumentRequiredInput,
  command_argument_min_value: CommandArgumentMinValueInput,
  command_argument_max_value: CommandArgumentMaxValueInput,
  command_argument_max_length: CommandArgumentMaxLengthInput,
  command_argument_choices: CommandArgumentChoicesInput,
  command_contexts: CommandContextsInput,
  command_integrations: CommandIntegrationsInput,
  command_permissions: CommandPermissionsInput,
  event_type: EventTypeInput,
  event_filter_target: EventFilterTargetInput,
  event_filter_mode: EventFilterModeInput,
  event_filter_value: EventFilterValueInput,
  message_data: MessageDataInput,
  message_template_id: MessageTemplateInput,
  message_target: MessageTargetInput,
  emoji_data: EmojiDataInput,
  response_target: ResponseTargetInput,
  message_ephemeral: MessageEphemeralInput,
  modal_data: ModalDataInput,
  channel_data: ChannelDataInput,
  thread_data: ThreadDataInput,
  channel_target: ChannelTargetInput,
  role_data: RoleDataInput,
  role_target: RoleTargetInput,
  variable_id: VariableIdInput,
  variable_scope: VariableScopeInput,
  variable_operation: VariableOperationInput,
  variable_value: VariableValueInput,
  http_request_data: HttpRequestDataInput,
  expression: ExpressionInput,
  random_min: RandomMinInput,
  random_max: RandomMaxInput,
  audit_log_reason: AuditLogReasonInput,
  user_target: UserTargetInput,
  guild_target: GuildTargetInput,
  member_ban_delete_message_duration_seconds:
    MemberBanDeleteMessageDurationInput,
  member_timeout_duration_seconds: MemberTimeoutDurationInput,
  member_nick: MemberNickInput,
  roblox_user_target: RobloxUserTargetInput,
  roblox_lookup_mode: RobloxLookupModeInput,
  log_level: LogLevelInput,
  log_message: LogMessageInput,
  condition_compare_base_value: ConditionCompareBaseValueInput,
  condition_item_compare_mode: ConditionItemCompareModeInput,
  condition_item_compare_value: ConditionItemCompareValueInput,
  condition_user_base_value: ConditionUserBaseValueInput,
  condition_item_user_mode: ConditionItemUserModeInput,
  condition_item_user_value: ConditionItemUserValueInput,
  condition_channel_base_value: ConditionChannelBaseValueInput,
  condition_item_channel_mode: ConditionItemChannelModeInput,
  condition_item_channel_value: ConditionItemChannelValueInput,
  condition_role_base_value: ConditionRoleBaseValueInput,
  condition_item_role_mode: ConditionItemRoleModeInput,
  condition_item_role_value: ConditionItemRoleValueInput,
  condition_allow_multiple: ConditionAllowMultipleInput,
  loop_count: ControlLoopCountInput,
  sleep_duration_seconds: ControlSleepDurationInput,
};

function nodeTypeDocsPage(nodeType: string) {
  let group: string | null = null;
  if (nodeType.startsWith("action_")) {
    group = "actions";
  } else if (nodeType.startsWith("control_")) {
    group = "controls";
  } else if (nodeType.startsWith("option_")) {
    group = "options";
  } else if (nodeType.startsWith("entry_")) {
    group = "entries";
  }

  if (!group) {
    return null;
  }

  return (
    env.NEXT_PUBLIC_DOCS_LINK + "/reference/blocks/" + group + "/" + nodeType
  );
}

export default function FlowNodeEditor({ nodeId }: Props) {
  const { setNodes, deleteElements } = useReactFlow<Node<NodeData>>();
  const store = useStoreApi();

  function close() {
    store.getState().addSelectedNodes([]);
  }

  const nodes = useNodes<Node<NodeData>>();

  const node = nodes.find((n) => n.id === nodeId);
  const nodeValues = useNodeValues(node?.type ?? "");

  const data = node?.data;

  function updateData(newData: Partial<NodeData>) {
    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              ...newData,
            },
          };
        }
        return n;
      })
    );
  }

  function deleteNode() {
    deleteElements({
      nodes: [node!],
    });
  }

  function duplicateNode() {
    if (!node || nodeValues.ownsChildren) return;

    const newNode = {
      ...node,
      id: getNodeId(),
      selected: false,
      position: {
        x: node?.position.x! + 100,
        y: node?.position.y! + 100,
      },
    };
    setNodes((nodes) => nodes.concat(newNode));
  }

  const values = useNodeValues(node?.type!);

  const errors: Record<string, string> = useMemo(() => {
    if (!values.dataSchema) return {};

    const res = values.dataSchema.safeParse(data);
    if (res.success) {
      return {};
    }

    return Object.fromEntries(
      res.error.issues.map((issue) => [issue.path.join("."), issue.message])
    );
  }, [values.dataSchema, data]);

  if (!node || !data) return null;

  const creditsCost =
    typeof values.creditsCost === "function"
      ? values.creditsCost(data)
      : values.creditsCost;

  const docsPage = nodeTypeDocsPage(node.type!);

  return (
    <div className="absolute top-0 left-0 bg-background w-96 h-full flex flex-col">
      <ScrollArea>
        <div className="p-5">
          <div className="flex-none">
            <div className="flex items-start justify-between mb-5">
              <div className="text-xl font-bold text-foreground">
                Cài đặt khối
              </div>
              <XIcon
                className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={close}
              />
            </div>
            <div className="mb-5">
              <div className="flex items-center gap-1.5">
                <div className="text-lg font-bold text-foreground mb-1">
                  {values.defaultTitle}
                </div>
                {docsPage && (
                  <Link href={docsPage} target="_blank">
                    <HelpCircleIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  </Link>
                )}
              </div>
              <div className="text-muted-foreground mb-3">
                {values.defaultDescription}
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="bg-muted rounded px-2 py-1 text-xs">
                  {nodeId}
                </div>
                {creditsCost && (
                  <div className="bg-muted rounded px-2 py-1 text-xs flex gap-1">
                    {creditsCost}
                    <div>credit{creditsCost === 1 ? "" : "s"}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-3 flex-auto">
            {values.dataFields.map((field) => {
              const Input = intputs[field];
              if (!Input) return null;

              return (
                <Input
                  key={field}
                  id={nodeId}
                  type={node.type}
                  data={data}
                  updateData={updateData}
                  errors={errors}
                />
              );
            })}
          </div>
          <div className="flex-none space-y-3 mt-5">
            {!values.fixed && (
              <>
                <Button
                  variant="destructive"
                  onClick={deleteNode}
                  className="w-full flex gap-2"
                >
                  <TrashIcon className="h-5 w-5" />
                  <div>Xóa khối</div>
                </Button>
                {!nodeValues.ownsChildren && (
                  <Button
                    variant="secondary"
                    onClick={duplicateNode}
                    className="w-full flex gap-2"
                  >
                    <CopyIcon className="h-5 w-5" />
                    <div>Nhân bản khối</div>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function CustomLabelInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="custom_label"
      title="Nhãn tùy chỉnh"
      description="Đặt nhãn tùy chỉnh cho khối này để dễ nhận diện hơn. Đây là tùy chọn."
      value={data.custom_label || ""}
      updateValue={(v) => updateData({ custom_label: v || undefined })}
      errors={errors}
    />
  );
}

function TemporaryNameInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="temporary_name"
      title="Biến tạm thời"
      description="Lưu kết quả của khối này vào biến tạm thời để sử dụng sau."
      value={data.temporary_name || ""}
      updateValue={(v) => updateData({ temporary_name: v || undefined })}
      errors={errors}
    />
  );
}

function NameInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="name"
      title="Tên"
      value={data.name || ""}
      updateValue={(v) => updateData({ name: v || undefined })}
      errors={errors}
    />
  );
}

function DescriptionInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="description"
      title="Mô tả"
      value={data.description || ""}
      updateValue={(v) => updateData({ description: v || undefined })}
      errors={errors}
    />
  );
}

function CommandArgumentTypeInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="command_argument_type"
      title="Loại tham số"
      type="select"
      options={[
        { value: "string", label: "Văn bản" },
        { value: "integer", label: "Số nguyên" },
        { value: "number", label: "Số thập phân" },
        { value: "boolean", label: "Đúng/Sai" },
        { value: "user", label: "Người dùng" },
        { value: "channel", label: "Kênh" },
        { value: "role", label: "Vai trò" },
        { value: "mentionable", label: "Nhắc đến" },
        { value: "attachment", label: "Tệp đính kèm" },
      ]}
      value={data.command_argument_type || ""}
      updateValue={(v) => updateData({ command_argument_type: v || undefined })}
      errors={errors}
    />
  );
}

function CommandArgumentRequiredInput({
  data,
  updateData,
  errors,
}: InputProps) {
  return (
    <BaseCheckbox
      field="command_argument_required"
      title="Tham số bắt buộc"
      value={!!data.command_argument_required}
      updateValue={(v) =>
        updateData({ command_argument_required: v || undefined })
      }
      errors={errors}
    />
  );
}

function CommandArgumentMinValueInput({
  data,
  updateData,
  errors,
}: InputProps) {
  if (
    data.command_argument_type !== "number" &&
    data.command_argument_type !== "integer"
  )
    return null;

  return (
    <BaseInput
      type="text"
      field="command_argument_min_value"
      title="Giá trị tối thiểu"
      value={data.command_argument_min_value?.toString() || ""}
      updateValue={(v) =>
        updateData({
          command_argument_min_value: parseFloat(v) || undefined,
        })
      }
      errors={errors}
    />
  );
}

function CommandArgumentMaxValueInput({
  data,
  updateData,
  errors,
}: InputProps) {
  if (
    data.command_argument_type !== "number" &&
    data.command_argument_type !== "integer"
  )
    return null;

  return (
    <BaseInput
      type="text"
      field="command_argument_max_value"
      title="Giá trị tối đa"
      value={data.command_argument_max_value?.toString() || ""}
      updateValue={(v) =>
        updateData({
          command_argument_max_value: parseFloat(v) || undefined,
        })
      }
      errors={errors}
    />
  );
}

function CommandArgumentMaxLengthInput({
  data,
  updateData,
  errors,
}: InputProps) {
  if (data.command_argument_type !== "string") return null;

  return (
    <BaseInput
      type="text"
      field="command_argument_max_length"
      title="Độ dài tối đa"
      value={data.command_argument_max_length?.toString() || ""}
      updateValue={(v) =>
        updateData({ command_argument_max_length: parseInt(v) || undefined })
      }
      errors={errors}
    />
  );
}

function CommandArgumentChoicesInput({ data, updateData, errors }: InputProps) {
  const addChoice = useCallback(() => {
    updateData({
      command_argument_choices: [
        ...(data.command_argument_choices || []),
        { name: "", value: "" },
      ],
    });
  }, [updateData, data]);

  const clearChoices = useCallback(() => {
    updateData({
      command_argument_choices: [],
    });
  }, [updateData]);

  const removeChoice = useCallback(
    (i: number) => {
      updateData({
        command_argument_choices: data.command_argument_choices?.filter(
          (_, j) => j !== i
        ),
      });
    },
    [updateData, data]
  );

  const updateChoice = useCallback(
    (i: number, newData: Partial<CommandArgumentChoiceData>) => {
      const choice = data.command_argument_choices?.[i];
      if (!choice) return;

      Object.assign(choice, newData);

      updateData({
        command_argument_choices: data.command_argument_choices,
      });
    },
    [updateData, data]
  );

  if (
    data.command_argument_type !== "string" &&
    data.command_argument_type !== "integer" &&
    data.command_argument_type !== "number"
  )
    return null;

  return (
    <div>
      <div className="font-medium text-foreground mb-2">Lựa chọn</div>
      <div className="text-muted-foreground text-sm mb-2">
        Cho phép người dùng chọn từ danh sách. Để trống để cho phép bất kỳ giá trị nào.
      </div>
      <div className="flex flex-col gap-3 mb-3">
        {data.command_argument_choices?.map((choice, i) => (
          <div className="flex gap-2" key={i}>
            <Input
              type="text"
              placeholder="Tên"
              value={choice.name || ""}
              onChange={(e) => updateChoice(i, { name: e.target.value })}
            />
            <Input
              type="text"
              placeholder="Giá trị"
              value={choice.value || ""}
              onChange={(e) => updateChoice(i, { value: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" size="icon" onClick={addChoice}>
          <PlusIcon className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={clearChoices}>
          <TrashIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function CommandPermissionsInput({ data, updateData, errors }: InputProps) {
  return (
    <BasePermissionInput
      field="command_permissions"
      title="Quyền bắt buộc"
      value={data.command_permissions || "0"}
      updateValue={(v) =>
        updateData({
          command_permissions: v === "0" ? undefined : v,
        })
      }
      errors={errors}
    />
  );
}

const availableCommandContextsValues = ["guild", "bot_dm", "private_channel"];

function CommandContextsInput({ data, updateData, errors }: InputProps) {
  const values = useMemo(() => {
    return availableCommandContextsValues.filter(
      (v) => !data.command_disabled_contexts?.includes(v)
    );
  }, [data.command_disabled_contexts]);

  const updateValues = useCallback(
    (values: string[]) => {
      const newValues = availableCommandContextsValues.filter(
        (v) => !values.includes(v)
      );

      updateData({
        command_disabled_contexts: newValues.length > 0 ? newValues : undefined,
      });
    },
    [updateData]
  );

  return (
    <>
      <BaseMultiSelect
        field="command_disabled_contexts"
        title="Ngữ cảnh"
        values={values}
        options={[
          { value: "guild", label: "Trong server" },
          { value: "bot_dm", label: "Trong DM bot" },
          { value: "private_channel", label: "Trong DM khác" },
        ]}
        updateValues={updateValues}
        errors={errors}
      />
    </>
  );
}

const availableCommandIntegrationsValues = ["guild_install", "user_install"];

function CommandIntegrationsInput({ data, updateData, errors }: InputProps) {
  const values = useMemo(() => {
    return availableCommandIntegrationsValues.filter(
      (v) => !data.command_disabled_integrations?.includes(v)
    );
  }, [data.command_disabled_integrations]);

  const updateValues = useCallback(
    (values: string[]) => {
      const newValues = availableCommandIntegrationsValues.filter(
        (v) => !values.includes(v)
      );

      updateData({
        command_disabled_integrations:
          newValues.length > 0 ? newValues : undefined,
      });
    },
    [updateData]
  );

  return (
    <BaseMultiSelect
      field="command_disabled_integrations"
      title="Loại tích hợp"
      values={values}
      options={[
        { value: "guild_install", label: "Cài trong server" },
        { value: "user_install", label: "Cài cho người dùng" },
      ]}
      updateValues={updateValues}
      errors={errors}
    />
  );
}

function EventTypeInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="select"
      field="event_type"
      title="Sự kiện"
      options={[
        { value: "message_create", label: "Tạo tin nhắn" },
        { value: "message_update", label: "Cập nhật tin nhắn" },
        { value: "message_delete", label: "Xóa tin nhắn" },
        { value: "guild_member_add", label: "Thêm thành viên" },
        { value: "guild_member_remove", label: "Xóa thành viên" },
      ]}
      value={data.event_type || ""}
      updateValue={(v) => updateData({ event_type: v || undefined })}
      errors={errors}
    />
  );
}

function EventFilterTargetInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="select"
      field="event_filter_target"
      title="Mục tiêu lọc"
      options={[
        { value: "message_content", label: "Nội dung tin nhắn" },
        { value: "user_id", label: "ID người dùng" },
        { value: "guild_id", label: "ID server" },
        { value: "channel_id", label: "ID kênh" },
      ]}
      value={data.event_filter_target || ""}
      updateValue={(v) =>
        updateData({
          event_filter_target: v || undefined,
        })
      }
      errors={errors}
    />
  );
}

function EventFilterModeInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="select"
      field="event_filter_mode"
      title="Chế độ lọc"
      options={[
        { value: "equal", label: "Bằng" },
        { value: "not_equal", label: "Không bằng" },
        { value: "contains", label: "Chứa" },
        { value: "starts_with", label: "Bắt đầu bằng" },
        { value: "ends_with", label: "Kết thúc bằng" },
      ]}
      value={data.event_filter_mode || ""}
      updateValue={(v) => updateData({ event_filter_mode: v || undefined })}
      errors={errors}
    />
  );
}

function EventFilterValueInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="event_filter_value"
      title="Giá trị bộ lọc"
      value={data.event_filter_value || ""}
      updateValue={(v) =>
        updateData({
          event_filter_value: v || undefined,
        })
      }
      errors={errors}
    />
  );
}

function LogLevelInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="log_level"
      title="Mức độ nhật ký"
      type="select"
      options={[
        { value: "debug", label: "Gỡ lỗi" },
        { value: "info", label: "Thông tin" },
        { value: "warn", label: "Cảnh báo" },
        { value: "error", label: "Lỗi" },
      ]}
      value={data.log_level || ""}
      updateValue={(v) => updateData({ log_level: v || undefined })}
      errors={errors}
    />
  );
}

function LogMessageInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="textarea"
      field="log_message"
      title="Nội dung nhật ký"
      value={data.log_message || ""}
      updateValue={(v) => updateData({ log_message: v || undefined })}
      errors={errors}
      placeholders
    />
  );
}

function AuditLogReasonInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="audit_log_reason"
      title="Lý do Audit Log"
      description="Điều này sẽ xuất hiện trong nhật ký kiểm tra của Discord."
      value={data.audit_log_reason || ""}
      updateValue={(v) => updateData({ audit_log_reason: v || undefined })}
      errors={errors}
      placeholders
    />
  );
}

function HttpRequestDataInput({ data, updateData, errors }: InputProps) {
  // TODO: top level errors aren't displayed ...

  const updateField = useCallback(
    (newData: Partial<HTTPRequestData>) => {
      updateData({
        http_request_data: {
          ...data.http_request_data,
          ...newData,
        },
      });
    },
    [updateData, data]
  );

  const addHeader = useCallback(() => {
    updateData({
      http_request_data: {
        ...data.http_request_data,
        headers: [
          ...(data.http_request_data?.headers || []),
          { key: "", value: "" },
        ],
      },
    });
  }, [data, updateData]);

  const updateHeader = useCallback(
    (index: number, key: string, value: string) => {
      updateData({
        http_request_data: {
          ...data.http_request_data,
          headers: data.http_request_data?.headers?.map((h, i) =>
            i === index ? { key, value } : h
          ),
        },
      });
    },
    [data, updateData]
  );

  const removeHeader = useCallback(
    (index: number) => {
      updateData({
        http_request_data: {
          ...data.http_request_data,
          headers: data.http_request_data?.headers?.filter(
            (_, i) => i !== index
          ),
        },
      });
    },
    [data, updateData]
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full" variant="secondary">
          Cấu hình yêu cầu
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-auto max-h-[90dvh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cấu hình yêu cầu HTTP</DialogTitle>
          <DialogDescription>
            Cấu hình yêu cầu HTTP để gọi API đến dịch vụ bên thứ ba.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <BaseInput
            type="select"
            field="http_request_data.method"
            title="Phương thức"
            description="Phương thức HTTP sử dụng cho yêu cầu."
            options={[
              { value: "GET", label: "GET" },
              { value: "POST", label: "POST" },
              { value: "PUT", label: "PUT" },
              { value: "PATCH", label: "PATCH" },
              { value: "DELETE", label: "DELETE" },
            ]}
            value={data.http_request_data?.method || ""}
            updateValue={(v) => updateField({ method: v })}
            errors={errors}
          />
          <BaseInput
            type="text"
            field="http_request_data.url"
            title="URL"
            description="URL để gửi yêu cầu đến."
            value={data.http_request_data?.url || ""}
            updateValue={(v) => updateField({ url: v })}
            errors={errors}
            placeholders
          />
          <div>
            <div className="font-medium text-foreground mb-1">Tiêu đề</div>
            <div className="text-muted-foreground text-sm mb-2">
              Các tiêu đề gửi kèm yêu cầu.
            </div>
            <div className="flex flex-col gap-3">
              {data.http_request_data?.headers?.map((h, i) => (
                <div className="flex gap-2" key={i}>
                  <Input
                    type="text"
                    placeholder="Khóa"
                    value={h.key || ""}
                    onChange={(e) => updateHeader(i, e.target.value, h.value)}
                  />
                  <Input
                    type="text"
                    placeholder="Giá trị"
                    value={h.value || ""}
                    onChange={(e) => updateHeader(i, h.key, e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-none"
                    onClick={() => removeHeader(i)}
                  >
                    <MinusIcon className="h-5 w-5" />
                  </Button>
                </div>
              ))}

              <div className="flex">
                <Button variant="outline" size="icon" onClick={addHeader}>
                  <PlusIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-foreground">Nội dung JSON</div>
              <Switch
                checked={!!data.http_request_data?.body_json}
                onCheckedChange={(checked) =>
                  updateField({
                    body_json: checked ? {} : undefined,
                  })
                }
              />
            </div>
            {!!data.http_request_data?.body_json && (
              <JsonEditor
                src={data.http_request_data?.body_json || {}}
                onChange={(v) => updateField({ body_json: v })}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExpressionInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="textarea"
      field="expression"
      title="Biểu thức"
      description="Biểu thức để đánh giá không có dấu ngoặc kép"
      value={data.expression || ""}
      updateValue={(v) =>
        updateData({
          expression: v || undefined,
        })
      }
      errors={errors}
      placeholders
      disablePlaceholderBrackets
    />
  );
}

function RandomMinInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="random_min"
      title="Tối thiểu"
      value={data.random_min || ""}
      updateValue={(v) => updateData({ random_min: v || undefined })}
      errors={errors}
    />
  );
}

function RandomMaxInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="random_max"
      title="Tối đa"
      value={data.random_max || ""}
      updateValue={(v) => updateData({ random_max: v || undefined })}
      errors={errors}
    />
  );
}

function UserTargetInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="user_target"
      title="Người dùng mục tiêu"
      value={data.user_target || ""}
      updateValue={(v) => updateData({ user_target: v || undefined })}
      errors={errors}
      placeholders
    />
  );
}

function GuildTargetInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="guild_target"
      title="Server mục tiêu"
      value={data.guild_target || ""}
      updateValue={(v) => updateData({ guild_target: v || undefined })}
      errors={errors}
      placeholders
    />
  );
}

function MemberBanDeleteMessageDurationInput({
  data,
  updateData,
  errors,
}: InputProps) {
  return (
    <BaseInput
      type="text"
      field="member_ban_delete_message_duration_seconds"
      title="Thời gian xóa tin nhắn"
      description="Số giây để xóa tin nhắn."
      value={data.member_ban_delete_message_duration_seconds || ""}
      updateValue={(v) =>
        updateData({
          member_ban_delete_message_duration_seconds: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function MemberTimeoutDurationInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="member_timeout_duration_seconds"
      title="Thời gian cấm"
      description="Số giây để cấm người dùng."
      value={data.member_timeout_duration_seconds || ""}
      updateValue={(v) =>
        updateData({ member_timeout_duration_seconds: v || undefined })
      }
      errors={errors}
      placeholders
    />
  );
}

function MemberNickInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="member_data"
      title="Biệt danh thành viên"
      value={data.member_data?.nick || ""}
      updateValue={(v) =>
        updateData({ member_data: v ? { nick: v } : undefined })
      }
      errors={errors}
      placeholders
    />
  );
}

function RobloxUserTargetInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="roblox_user_target"
      title="Mục tiêu người dùng Roblox"
      value={data.roblox_user_target || ""}
      updateValue={(v) => updateData({ roblox_user_target: v || undefined })}
      errors={errors}
      placeholders
    />
  );
}

function RobloxLookupModeInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="select"
      field="roblox_lookup_mode"
      title="Chế độ tra cứu Roblox"
      value={data.roblox_lookup_mode || ""}
      options={[
        { label: "ID", value: "id" },
        { label: "Tên người dùng", value: "username" },
      ]}
      updateValue={(v) => updateData({ roblox_lookup_mode: v || undefined })}
      errors={errors}
    />
  );
}

function MessageTemplateInput({ data, updateData, errors }: InputProps) {
  const messages = useMessages();

  const appId = useAppId();

  return (
    <div className="flex space-x-2 items-end">
      <BaseInput
        type="select"
        field="message_template_id"
        title="Mẫu tin nhắn"
        description="Chọn mẫu tin nhắn để sử dụng cho phản hồi."
        options={messages?.map((m) => ({
          value: m!.id,
          label: m!.name,
        }))}
        value={data.message_template_id || ""}
        updateValue={(v) => updateData({ message_template_id: v || undefined })}
        errors={errors}
        clearable
      />
      {data.message_template_id ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" asChild>
              <Link
                href={{
                  pathname: "/apps/[appId]/messages/[messageId]",
                  query: { appId: appId, messageId: data.message_template_id },
                }}
                target="_blank"
              >
                <PencilIcon className="h-5 w-5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sửa mẫu tin nhắn</TooltipContent>
        </Tooltip>
      ) : (
        <MessageCreateDialog
          onMessageCreated={(v) => updateData({ message_template_id: v })}
        >
          <Button variant="outline" size="icon">
            <PlusIcon className="h-5 w-5" />
          </Button>
        </MessageCreateDialog>
      )}
    </div>
  );
}

function MessageDataInput({ data, updateData, errors }: InputProps) {
  if (data.message_template_id) {
    return null;
  }

  return (
    <>
      <BaseInput
        type="textarea"
        field="message_data"
        title="Văn bản"
        description="Chỉnh sửa nội dung tin nhắn tại đây hoặc nhấp vào bên dưới để mở trình soạn đầy đủ với hỗ trợ embed và thành phần."
        value={data.message_data?.content || ""}
        updateValue={(v) =>
          updateData({
            message_data: {
              ...data.message_data,
              content: v || undefined,
            },
          })
        }
        errors={errors}
        placeholders
      />

      <MessageEditorDialog
        onClose={(v) => updateData({ message_data: v })}
        message={data.message_data || {}}
      >
        <Button className="w-full">Sửa tin nhắn</Button>
      </MessageEditorDialog>

      <BaseCheckbox
        field="message_data.allowed_mentions"
        title="Cho phép nhắc vai trò"
        description="Theo mặc định, chỉ có thể nhắc người dùng. Bật tùy chọn này để cho phép nhắc vai trò và @everyone."
        value={!!data.message_data?.allowed_mentions}
        updateValue={(v) =>
          updateData({
            message_data: {
              ...data.message_data,
              allowed_mentions: v
                ? {
                    parse: ["roles", "everyone", "users"],
                  }
                : undefined,
            },
          })
        }
        errors={errors}
      />
    </>
  );
}

function MessageTargetInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="message_target"
      title="Tin nhắn mục tiêu"
      value={data.message_target || ""}
      updateValue={(v) => updateData({ message_target: v || undefined })}
      errors={errors}
      placeholders
    />
  );
}

function ResponseTargetInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="select"
      field="message_target"
      title="Phản hồi mục tiêu"
      value={data.message_target || ""}
      options={[
        {
          label: "Phản hồi gốc",
          value: "@original",
        },
      ]}
      updateValue={(v) => updateData({ message_target: v || undefined })}
      errors={errors}
    />
  );
}

function MessageEphemeralInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseCheckbox
      field="message_ephemeral"
      title="Phản hồi công khai"
      description="Nếu bật, phản hồi sẽ hiển thị với tất cả mọi người. Nếu tắt, chỉ người kích hoạt luồng mới thấy."
      value={!data.message_ephemeral}
      updateValue={(v) => updateData({ message_ephemeral: !v || undefined })}
      errors={errors}
    />
  );
}

function EmojiDataInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseEmojiPicker
      title="Emoji"
      field="emoji_data"
      errors={errors}
      emoji={data.emoji_data}
      onChange={(emoji) =>
        updateData({
          emoji_data: emoji,
        })
      }
    />
  );
}

function ModalDataInput({ data, updateData, errors }: InputProps) {
  const addInput = useCallback(() => {
    updateData({
      modal_data: {
        title: data.modal_data?.title,
        components: [
          ...(data.modal_data?.components || []),
          { components: [{ style: 1 }] },
        ],
      },
    });
  }, [updateData, data]);

  const clearInputs = useCallback(() => {
    updateData({
      modal_data: {
        title: data.modal_data?.title,
        components: [],
      },
    });
  }, [updateData, data]);

  const updateComponentField = useCallback(
    (r: number, c: number, newData: Partial<ModalComponentData>) => {
      const current = data.modal_data || {};
      if (!current.components) return;

      const row = current.components[r];
      if (!row || !row.components) return;

      const component = row.components[c];
      if (!component) return;

      Object.assign(component, newData);

      updateData({
        modal_data: current,
      });
    },
    [updateData, data]
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">Cấu hình Modal</Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-auto max-h-[90dvh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cấu hình Modal</DialogTitle>
          <DialogDescription>
            Cấu hình modal của bạn! Modal phải có tiêu đề và ít nhất một thành phần nhập liệu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <BaseInput
            type="text"
            field="modal_data"
            title="Tiêu đề"
            value={data.modal_data?.title || ""}
            updateValue={(v) =>
              updateData({
                modal_data: {
                  title: v || undefined,
                  components: data.modal_data?.components,
                },
              })
            }
            errors={errors}
            placeholders
          />

          <div className="space-y-3">
            <div className="font-medium text-foreground">Đầu vào</div>
            {data.modal_data?.components?.map((row, r) =>
              row?.components?.map((component, c) => (
                <Card className="space-y-3 p-3 -mx-1" key={`${r}-${c}`}>
                  <div className="flex space-x-3">
                    <BaseInput
                      type="select"
                      field={`modal_data.components.${r}.components.${c}.type`}
                      title="Loại"
                      value={component.style?.toString() || "1"}
                      options={[
                        {
                          label: "Ngắn",
                          value: "1",
                        },
                        {
                          label: "Đoạn văn",
                          value: "2",
                        },
                      ]}
                      updateValue={(v) =>
                        updateComponentField(r, c, {
                          style: parseInt(v) || 1,
                        })
                      }
                      errors={errors}
                    />
                    <BaseCheckbox
                      field={`modal_data.components.${r}.components.${c}.required`}
                      title="Bắt buộc"
                      value={component?.required || false}
                      updateValue={(v) =>
                        updateComponentField(r, c, {
                          required: v,
                        })
                      }
                      errors={errors}
                    />
                  </div>
                  <BaseInput
                    type="text"
                    field={`modal_data.components.${r}.components.${c}.custom_id`}
                    title="Định danh"
                    description="Dùng để nhận diện đầu vào trong luồng của bạn."
                    value={component?.custom_id || ""}
                    updateValue={(v) =>
                      updateComponentField(r, c, {
                        custom_id: v || undefined,
                      })
                    }
                    errors={errors}
                    placeholders
                  />
                  <BaseInput
                    type="text"
                    field={`modal_data.components.${r}.components.${c}.label`}
                    title="Nhãn"
                    value={component?.label || ""}
                    updateValue={(v) =>
                      updateComponentField(r, c, {
                        label: v || undefined,
                      })
                    }
                    errors={errors}
                    placeholders
                  />
                  <BaseInput
                    type="text"
                    field={`modal_data.components.${r}.components.${c}.placeholder`}
                    title="Chữ giữ chỗ"
                    value={component?.placeholder || ""}
                    updateValue={(v) =>
                      updateComponentField(r, c, {
                        placeholder: v || undefined,
                      })
                    }
                    errors={errors}
                    placeholders
                  />
                </Card>
              ))
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={addInput}
              disabled={(data.modal_data?.components?.length || 0) >= 5}
            >
              Thêm đầu vào
            </Button>
            <Button variant="outline" onClick={clearInputs}>
              Xóa đầu vào
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelDataInput({ data, updateData, errors }: InputProps) {
  const addOverwrite = useCallback(() => {
    updateData({
      channel_data: {
        ...data.channel_data,
        permission_overwrites: [
          ...(data.channel_data?.permission_overwrites || []),
          { type: 0, allow: "0", deny: "0" },
        ],
      },
    });
  }, [updateData, data]);

  const clearOverwrites = useCallback(() => {
    updateData({
      channel_data: { ...data.channel_data, permission_overwrites: [] },
    });
  }, [updateData, data]);

  const updateOverwrite = useCallback(
    (i: number, newData: Partial<PermissionOverwriteData>) => {
      const overwrite = data.channel_data?.permission_overwrites?.[i];
      if (!overwrite) return;

      Object.assign(overwrite, newData);

      updateData({
        channel_data: data.channel_data,
      });
    },
    [updateData, data]
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">Cấu hình kênh</Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-auto max-h-[90dvh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cấu hình kênh</DialogTitle>
          <DialogDescription>
            Cấu hình kênh của bạn! Kênh phải có một trong các loại có sẵn và tên. Các trường khác là tùy chọn.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex space-x-3">
            <BaseInput
              type="select"
              field={`channel_data.type`}
              title="Loại"
              value={data.channel_data?.type?.toString() || "0"}
              options={[
                {
                  label: "Văn bản",
                  value: "0",
                },
                {
                  label: "Thoại",
                  value: "2",
                },
                {
                  label: "Danh mục",
                  value: "4",
                },
                {
                  label: "Thông báo",
                  value: "5",
                },
                {
                  label: "Sân khấu",
                  value: "13",
                },
                {
                  label: "Diễn đàn",
                  value: "15",
                },
                {
                  label: "Phương tiện",
                  value: "16",
                },
              ]}
              updateValue={(v) =>
                updateData({
                  channel_data: {
                    ...data.channel_data,
                    type: parseInt(v) || 0,
                  },
                })
              }
              errors={errors}
            />

            {(!data.channel_data?.type || data.channel_data.type === 0) && (
              <BaseCheckbox
                field="channel_data.nsfw"
                title="NSFW"
                value={data.channel_data?.nsfw || false}
                updateValue={(v) =>
                  updateData({
                    channel_data: {
                      ...data.channel_data,
                      nsfw: v,
                    },
                  })
                }
                errors={errors}
              />
            )}
          </div>

          <BaseInput
            type="text"
            field="channel_data.name"
            title="Tên"
            description="Tên của kênh."
            value={data.channel_data?.name || ""}
            updateValue={(v) =>
              updateData({
                channel_data: { ...data.channel_data, name: v || undefined },
              })
            }
            errors={errors}
            placeholders
          />

          {(!data.channel_data?.type ||
            data.channel_data.type === 0 ||
            data.channel_data.type === 5) && (
            <BaseInput
              type="text"
              field="channel_data.topic"
              title="Chủ đề"
              description="Chủ đề của kênh."
              value={data.channel_data?.topic || ""}
              updateValue={(v) =>
                updateData({
                  channel_data: {
                    ...data.channel_data,
                    topic: v || undefined,
                  },
                })
              }
              errors={errors}
              placeholders
            />
          )}

          {data.channel_data?.type === 2 ||
            (data.channel_data?.type === 13 && (
              <>
                <BaseInput
                  type="text"
                  field="channel_data.bitrate"
                  title="Tốc độ bit"
                  description="Tốc độ bit của kênh."
                  value={data.channel_data?.bitrate || ""}
                  updateValue={(v) =>
                    updateData({
                      channel_data: {
                        ...data.channel_data,
                        bitrate: v || undefined,
                      },
                    })
                  }
                  errors={errors}
                  placeholders
                />
                <BaseInput
                  type="text"
                  field="channel_data.user_limit"
                  title="Giới hạn người dùng"
                  description="Giới hạn người dùng của kênh."
                  value={data.channel_data?.user_limit?.toString() || ""}
                  updateValue={(v) =>
                    updateData({
                      channel_data: {
                        ...data.channel_data,
                        user_limit: v || undefined,
                      },
                    })
                  }
                  errors={errors}
                  placeholders
                />
              </>
            ))}

          {data.channel_data?.type !== 4 && (
            <BaseInput
              type="text"
              field="channel_data.parent"
              title="Danh mục"
              description="Danh mục mà kênh sẽ được tạo trong."
              value={data.channel_data?.parent || ""}
              updateValue={(v) =>
                updateData({
                  channel_data: {
                    ...data.channel_data,
                    parent: v || undefined,
                  },
                })
              }
              errors={errors}
              placeholders
            />
          )}

          <BaseInput
            type="text"
            field="channel_data.position"
            title="Vị trí"
            description="Vị trí của kênh."
            value={data.channel_data?.position?.toString() || ""}
            updateValue={(v) =>
              updateData({
                channel_data: {
                  ...data.channel_data,
                  position: v || undefined,
                },
              })
            }
            errors={errors}
            placeholders
          />

          <div className="space-y-3">
            <div className="font-medium text-foreground">
              Ghi đè quyền
            </div>

            {data.channel_data?.permission_overwrites?.map((overwrite, i) => (
              <Card className="space-y-3 p-3 -mx-1" key={i}>
                <BaseInput
                  type="select"
                  field={`channel_data.permission_overwrites.${i}.type`}
                  title="Loại"
                  value={overwrite.type?.toString() || "0"}
                  options={[
                    {
                      label: "Vai trò",
                      value: "0",
                    },
                    {
                      label: "Người dùng",
                      value: "1",
                    },
                  ]}
                  updateValue={(v) =>
                    updateOverwrite(i, {
                      type: parseInt(v) || 0,
                    })
                  }
                  errors={errors}
                />
                <BaseInput
                  type="text"
                  field={`channel_data.permission_overwrites.${i}.id`}
                  title={overwrite.type === 0 ? "Vai trò" : "Người dùng"}
                  description="Dùng để nhận diện đầu vào trong luồng của bạn."
                  value={overwrite.id || ""}
                  updateValue={(v) =>
                    updateOverwrite(i, {
                      id: v || undefined,
                    })
                  }
                  errors={errors}
                  placeholders
                />
                <BasePermissionInput
                  field={`channel_data.permission_overwrites.${i}.allow`}
                  title="Cho phép"
                  value={overwrite.allow || ""}
                  updateValue={(v) =>
                    updateOverwrite(i, {
                      allow: v || undefined,
                    })
                  }
                  errors={errors}
                />
                <BasePermissionInput
                  field={`channel_data.permission_overwrites.${i}.deny`}
                  title="Từ chối"
                  value={overwrite.deny || ""}
                  updateValue={(v) =>
                    updateOverwrite(i, {
                      deny: v || undefined,
                    })
                  }
                  errors={errors}
                />
              </Card>
            ))}
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={addOverwrite}
              disabled={(data.modal_data?.components?.length || 0) >= 5}
            >
              Thêm ghi đè
            </Button>
            <Button variant="outline" onClick={clearOverwrites}>
              Xóa ghi đè
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThreadDataInput({ data, updateData, errors }: InputProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">Cấu hình luồng</Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-auto max-h-[90dvh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cấu hình luồng</DialogTitle>
          <DialogDescription>
            Cấu hình luồng của bạn! Luồng phải có tên và có thể liên kết với tin nhắn hoặc độc lập.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <BaseInput
            type="text"
            field="channel_data.parent"
            title="Kênh cha"
            description="Kênh cha mà luồng sẽ được tạo trong."
            value={data.channel_data?.parent || ""}
            updateValue={(v) =>
              updateData({
                channel_data: {
                  ...data.channel_data,
                  parent: v || undefined,
                },
              })
            }
            errors={errors}
            placeholders
          />

          <BaseInput
            type="text"
            field="message_target"
            title="Tin nhắn mục tiêu"
            description="Tin nhắn để bắt đầu luồng. Để trống để tạo luồng độc lập."
            value={data.message_target || ""}
            updateValue={(v) =>
              updateData({
                message_target: v || undefined,
              })
            }
            errors={errors}
            placeholders
          />

          {!data.message_target && (
            <BaseInput
              type="select"
              field={`channel_data.type`}
              title="Loại"
              value={data.channel_data?.type?.toString() || "11"}
              options={[
                {
                  label: "Luồng công khai",
                  value: "11",
                },
                {
                  label: "Luồng riêng tư",
                  value: "12",
                },
                {
                  label: "Luồng thông báo",
                  value: "10 ",
                },
              ]}
              updateValue={(v) =>
                updateData({
                  channel_data: {
                    ...data.channel_data,
                    type: parseInt(v) || undefined,
                  },
                })
              }
              errors={errors}
            />
          )}

          <BaseInput
            type="text"
            field="channel_data.name"
            title="Tên"
            description="Tên của kênh."
            value={data.channel_data?.name || ""}
            updateValue={(v) =>
              updateData({
                channel_data: { ...data.channel_data, name: v || undefined },
              })
            }
            errors={errors}
            placeholders
          />

          {(!data.channel_data?.type || data.channel_data.type === 0) && (
            <BaseCheckbox
              field="channel_data.invitable"
              title="Cho phép mời"
              description="Cho phép người không phải quản trị viên thêm thành viên mới vào luồng."
              value={data.channel_data?.invitable || false}
              updateValue={(v) =>
                updateData({
                  channel_data: {
                    ...data.channel_data,
                    invitable: v,
                  },
                })
              }
              errors={errors}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelTargetInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="channel_target"
      title="Kênh mục tiêu"
      value={data.channel_target || ""}
      updateValue={(v) => updateData({ channel_target: v || undefined })}
      errors={errors}
      placeholders
    />
  );
}

function RoleDataInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="role_data"
      title="Tên vai trò"
      value={data.role_data?.name || ""}
      updateValue={(v) =>
        updateData({ role_data: v ? { name: v } : undefined })
      }
      errors={errors}
      placeholders
    />
  );
}

function RoleTargetInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="role_target"
      title="Vai trò mục tiêu"
      value={data.role_target || ""}
      updateValue={(v) => updateData({ role_target: v || undefined })}
      errors={errors}
      placeholders
    />
  );
}

function VariableIdInput({ data, updateData, errors }: InputProps) {
  const variables = useVariables();

  const appId = useAppId();

  return (
    <div className="flex space-x-2 items-end">
      <BaseInput
        type="select"
        field="variable_id"
        title="Biến"
        options={variables?.map((v) => ({
          value: v!.id,
          label: v!.name,
        }))}
        value={data.variable_id || ""}
        updateValue={(v) => updateData({ variable_id: v || undefined })}
        errors={errors}
        clearable
      />
      {data.variable_id ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" asChild>
              <Link
                href={{
                  pathname: "/apps/[appId]/variables/[variableId]",
                  query: { appId: appId, variableId: data.variable_id },
                }}
                target="_blank"
              >
                <PencilIcon className="h-5 w-5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Quản lý biến</TooltipContent>
        </Tooltip>
      ) : (
        <VariableCreateDialog
          onVariableCreated={(v) => updateData({ variable_id: v })}
        >
          <Button variant="outline" size="icon">
            <PlusIcon className="h-5 w-5" />
          </Button>
        </VariableCreateDialog>
      )}
    </div>
  );
}

function VariableScopeInput({ data, updateData, errors }: InputProps) {
  const variables = useVariables();

  const scoped = useMemo(() => {
    const variable = variables?.find((v) => v?.id === data.variable_id);
    return variable?.scoped;
  }, [variables, data]);

  useEffect(() => {
    if (scoped === false) {
      updateData({ variable_scope: undefined });
    }
  }, [scoped, updateData]);

  if (!scoped) return null;

  return (
    <BaseInput
      type="text"
      field="variable_scope"
      title="Phạm vi"
      value={data.variable_scope || ""}
      updateValue={(v) => updateData({ variable_scope: v || undefined })}
      errors={errors}
      placeholders
    />
  );
}

function VariableOperationInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="select"
      field="variable_operation"
      title="Thao tác"
      value={data.variable_operation || ""}
      updateValue={(v) => updateData({ variable_operation: v || undefined })}
      options={[
        { value: "overwrite", label: "Ghi đè" },
        { value: "append", label: "Nối sau" },
        { value: "prepend", label: "Nối trước" },
        { value: "increment", label: "Tăng" },
        { value: "decrement", label: "Giảm" },
      ]}
      errors={errors}
    />
  );
}

function VariableValueInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="text"
      field="variable_value"
      title="Giá trị"
      value={data.variable_value || ""}
      updateValue={(v) => updateData({ variable_value: v || undefined })}
      errors={errors}
      placeholders
    />
  );
}

function ConditionCompareBaseValueInput({
  data,
  updateData,
  errors,
}: InputProps) {
  return (
    <BaseInput
      field="condition_base_value"
      title="Giá trị cơ sở"
      value={data.condition_base_value || ""}
      updateValue={(v) =>
        updateData({
          condition_base_value: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function ConditionItemCompareModeInput({
  data,
  updateData,
  errors,
}: InputProps) {
  return (
    <BaseInput
      type="select"
      field="condition_item_mode"
      title="Chế độ so sánh"
      options={[
        { value: "equal", label: "Bằng" },
        { value: "not_equal", label: "Không bằng" },
        { value: "greater_than", label: "Lớn hơn" },
        { value: "less_than", label: "Nhỏ hơn" },
        { value: "greater_than_or_equal", label: "Lớn hơn hoặc bằng" },
        { value: "less_than_or_equal", label: "Nhỏ hơn hoặc bằng" },
        { value: "contains", label: "Chứa" },
        { value: "starts_with", label: "Bắt đầu bằng" },
        { value: "ends_with", label: "Kết thúc bằng" },
      ]}
      value={data.condition_item_mode || ""}
      updateValue={(v) => updateData({ condition_item_mode: v || undefined })}
      errors={errors}
    />
  );
}

function ConditionItemCompareValueInput({
  data,
  updateData,
  errors,
}: InputProps) {
  return (
    <BaseInput
      field="condition_item_value"
      title="Giá trị so sánh"
      value={data.condition_item_value || ""}
      updateValue={(v) =>
        updateData({
          condition_item_value: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function ConditionUserBaseValueInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="condition_base_value"
      title="Người dùng cơ sở"
      value={data.condition_base_value || ""}
      updateValue={(v) =>
        updateData({
          condition_base_value: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function ConditionItemUserModeInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="select"
      field="condition_item_mode"
      title="Chế độ so sánh"
      options={[
        { value: "equal", label: "Bằng" },
        { value: "not_equal", label: "Không bằng" },
        { value: "has_role", label: "Có vai trò" },
        { value: "not_has_role", label: "Không có vai trò" },
        { value: "has_permission", label: "Có quyền" },
        { value: "not_has_permission", label: "Không có quyền" },
      ]}
      value={data.condition_item_mode || ""}
      updateValue={(v) => updateData({ condition_item_mode: v || undefined })}
      errors={errors}
    />
  );
}

function ConditionItemUserValueInput({ data, updateData, errors }: InputProps) {
  if (
    data.condition_item_mode === "has_role" ||
    data.condition_item_mode === "not_has_role"
  ) {
    return (
      <BaseInput
        field="condition_item_value"
        title="Vai trò so sánh"
        value={data.condition_item_value || ""}
        updateValue={(v) =>
          updateData({
            condition_item_value: v || undefined,
          })
        }
        errors={errors}
        placeholders
      />
    );
  } else if (
    data.condition_item_mode === "has_permission" ||
    data.condition_item_mode === "not_has_permission"
  ) {
    return (
      <BasePermissionInput
        field="condition_item_value"
        title="Quyền so sánh"
        value={data.condition_item_value || "0"}
        updateValue={(v) =>
          updateData({
            condition_item_value: v === "0" ? undefined : v,
          })
        }
        errors={errors}
      />
    );
  }

  return (
    <BaseInput
      field="condition_item_value"
      title="Người dùng so sánh"
      value={data.condition_item_value || ""}
      updateValue={(v) =>
        updateData({
          condition_item_value: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function ConditionChannelBaseValueInput({
  data,
  updateData,
  errors,
}: InputProps) {
  return (
    <BaseInput
      field="condition_base_value"
      title="Kênh cơ sở"
      value={data.condition_base_value || ""}
      updateValue={(v) =>
        updateData({
          condition_base_value: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function ConditionItemChannelModeInput({
  data,
  updateData,
  errors,
}: InputProps) {
  return (
    <BaseInput
      type="select"
      field="condition_item_mode"
      title="Chế độ so sánh"
      options={[
        { value: "equal", label: "Bằng" },
        { value: "not_equal", label: "Không bằng" },
      ]}
      value={data.condition_item_mode || ""}
      updateValue={(v) => updateData({ condition_item_mode: v || undefined })}
      errors={errors}
    />
  );
}

function ConditionItemChannelValueInput({
  data,
  updateData,
  errors,
}: InputProps) {
  return (
    <BaseInput
      field="condition_item_value"
      title="Kênh so sánh"
      value={data.condition_item_value || ""}
      updateValue={(v) =>
        updateData({
          condition_item_value: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function ConditionRoleBaseValueInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="condition_base_value"
      title="Vai trò cơ sở"
      value={data.condition_base_value || ""}
      updateValue={(v) =>
        updateData({
          condition_base_value: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function ConditionItemRoleModeInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      type="select"
      field="condition_item_mode"
      title="Chế độ so sánh"
      options={[
        { value: "equal", label: "Bằng" },
        { value: "not_equal", label: "Không bằng" },
      ]}
      value={data.condition_item_mode || ""}
      updateValue={(v) => updateData({ condition_item_mode: v || undefined })}
      errors={errors}
    />
  );
}

function ConditionItemRoleValueInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="condition_item_value"
      title="Vai trò so sánh"
      value={data.condition_item_value || ""}
      updateValue={(v) =>
        updateData({
          condition_item_value: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function ConditionAllowMultipleInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseCheckbox
      field="condition_allow_multiple"
      title="Cho phép nhiều điều kiện"
      description="Cho phép nhiều điều kiện được đáp ứng. Nếu tắt, chỉ điều kiện đầu tiên được đáp ứng sẽ được thực thi."
      value={data.condition_allow_multiple || false}
      updateValue={(v) =>
        updateData({ condition_allow_multiple: v || undefined })
      }
      errors={errors}
    />
  );
}

function ControlLoopCountInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="loop_count"
      title="Số lần lặp"
      description="Số lần chạy vòng lặp."
      value={data.loop_count || ""}
      updateValue={(v) =>
        updateData({
          loop_count: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function ControlSleepDurationInput({ data, updateData, errors }: InputProps) {
  return (
    <BaseInput
      field="sleep_duration_seconds"
      title="Thời gian chờ"
      description="Số giây chờ trước khi tiếp tục."
      value={data.sleep_duration_seconds || ""}
      updateValue={(v) =>
        updateData({
          sleep_duration_seconds: v || undefined,
        })
      }
      errors={errors}
      placeholders
    />
  );
}

function BaseInput({
  type,
  field,
  options,
  title,
  description,
  errors,
  value,
  placeholder,
  updateValue,
  placeholders,
  disablePlaceholderBrackets,
  clearable,
}: {
  type?: "text" | "textarea" | "select";
  field: string;
  options?: { value: string; label: string }[];
  title: string;
  description?: string;
  errors: Record<string, string>;
  value: string;
  placeholder?: string;
  updateValue: (value: string) => void;
  placeholders?: boolean;
  disablePlaceholderBrackets?: boolean;
  clearable?: boolean;
}) {
  const error = errors[field];

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onPlaceholderSelect = useCallback(
    (placeholder: string) => {
      const value = disablePlaceholderBrackets
        ? placeholder
        : `{{${placeholder}}}`;

      const element =
        type === "textarea" ? textareaRef.current : inputRef.current;

      if (!element) return;

      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? 0;

      const newValue =
        element.value.substring(0, start) +
        value +
        element.value.substring(end);

      updateValue(newValue);
    },
    [inputRef, textareaRef, type, updateValue, disablePlaceholderBrackets]
  );

  return (
    <div className="flex-auto">
      <div className="font-medium text-foreground">{title}</div>
      {description ? (
        <div className="text-muted-foreground text-sm mt-1">{description}</div>
      ) : null}
      <div className="relative mt-2">
        {type === "textarea" ? (
          <Textarea
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            ref={textareaRef}
            placeholder={placeholder}
          />
        ) : type === "select" ? (
          <Select value={value} onValueChange={(v) => updateValue(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options?.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
              {clearable && (
                <>
                  <SelectSeparator />
                  <Button
                    className="w-full px-2"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      updateValue("");
                    }}
                  >
                    Clear Selection
                  </Button>
                </>
              )}
            </SelectContent>
          </Select>
        ) : placeholders ? (
          <PlaceholderInput
            value={value}
            onChange={(v) => updateValue(v)}
            ref={inputRef}
            placeholder={placeholder}
          />
        ) : (
          <Input
            type="text"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            ref={inputRef}
            placeholder={placeholder}
          />
        )}
        {placeholders && (
          <FlowPlaceholderExplorer
            onSelect={onPlaceholderSelect}
            hideBrackets={disablePlaceholderBrackets}
          />
        )}
      </div>
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm flex items-center space-x-1 pt-2">
          <CircleAlertIcon className="h-5 w-5 flex-none" />
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}

function BaseCheckbox({
  field,
  title,
  description,
  errors,
  value,
  updateValue,
}: {
  field: string;
  title: string;
  description?: string;
  errors: Record<string, string>;
  value: boolean;
  updateValue: (value: boolean) => void;
}) {
  const error = errors[field];

  return (
    <div>
      <div className="font-medium text-foreground mb-2">{title}</div>
      {description ? (
        <div className="text-muted-foreground text-sm mb-2">{description}</div>
      ) : null}
      <Switch checked={value} onCheckedChange={updateValue} />
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm flex items-center space-x-1 pt-2">
          <CircleAlertIcon className="h-5 w-5 flex-none" />
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}

function BaseMultiSelect({
  field,
  title,
  description,
  errors,
  options,
  values,
  updateValues,
}: {
  field: string;
  title: string;
  description?: string;
  errors: Record<string, string>;
  options: { value: string; label: string }[];
  values: string[];
  updateValues: (value: string[]) => void;
}) {
  const error = errors[field];

  return (
    <div>
      <div className="font-medium text-foreground mb-2">{title}</div>
      {description ? (
        <div className="text-muted-foreground text-sm mb-2">{description}</div>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full flex items-center">
            <div>Đã chọn {values.length}</div>
            <ChevronDownIcon className="h-4 w-4 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 max-h-[320px] overflow-y-auto">
          {options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={values.includes(o.value)}
              onCheckedChange={(v) => {
                if (v) {
                  updateValues([...values, o.value]);
                } else {
                  updateValues(values.filter((val) => val !== o.value));
                }
              }}
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm flex items-center space-x-1 pt-2">
          <CircleAlertIcon className="h-5 w-5 flex-none" />
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}

function BasePermissionInput({
  field,
  title,
  description,
  errors,
  value,
  updateValue,
}: {
  field: string;
  title: string;
  description?: string;
  errors: Record<string, string>;
  value: string;
  updateValue: (value: string) => void;
}) {
  const availablePermissions = useMemo(
    () =>
      permissionBits.map((p) => ({
        value: p.bit.toString(),
        label: p.label,
      })),
    []
  );

  const enabledPermissions = useMemo(
    () => decodePermissionsBitset(value || "0").map((p) => p.bit.toString()),
    [value]
  );

  const setPermissions = useCallback(
    (v: string[]) => {
      const newPerms = encodePermissionsBitset(v.map((p) => parseInt(p)));

      updateValue(newPerms);
    },
    [updateValue]
  );

  return (
    <BaseMultiSelect
      field={field}
      title={title}
      description={description}
      values={enabledPermissions}
      options={availablePermissions}
      updateValues={setPermissions}
      errors={errors}
    />
  );
}

function BaseEmojiPicker({
  title,
  description,
  field,
  errors,
  emoji,
  onChange,
}: {
  title: string;
  description?: string;
  field: string;
  errors: Record<string, string>;
  emoji: EmojiData | undefined;
  onChange: (emoji: EmojiData | undefined) => void;
}) {
  const error = errors[field];

  return (
    <div className="flex-none">
      <div className="font-medium text-foreground mb-2">{title}</div>
      {description ? (
        <div className="text-muted-foreground text-sm mb-2">{description}</div>
      ) : null}
      <div className="flex">
        <EmojiPicker onEmojiSelect={onChange}>
          <Button size="icon" variant="outline">
            {emoji?.id ? (
              <img
                src={`https://cdn.discordapp.com/emojis/${emoji.id}.webp`}
                alt=""
                className="h-6 w-6"
              />
            ) : emoji ? (
              <Twemoji
                options={{
                  className: "h-6 w-6",
                }}
              >
                {emoji.name}
              </Twemoji>
            ) : (
              <SmileIcon className="h-6 w-6 text-foreground/80" />
            )}
          </Button>
        </EmojiPicker>
        {emoji && (
          <div
            className="flex items-center cursor-pointer pr-1 text-muted-foreground hover:text-foreground"
            onClick={() => onChange(undefined)}
          >
            <XIcon className="h-5 w-5" />
          </div>
        )}
      </div>
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm flex items-center space-x-1 pt-2">
          <CircleAlertIcon className="h-5 w-5 flex-none" />
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}
