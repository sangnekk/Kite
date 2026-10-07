import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCurrentFlow, useCurrentMessage } from "@/lib/message/state";
import {
  SELECT_MAX_PLACEHOLDER,
  SELECT_MAX_VALUES,
  SELECT_TYPE_CHANNEL,
  SELECT_TYPE_MENTIONABLE,
  SELECT_TYPE_ROLE,
  SELECT_TYPE_STRING,
  SELECT_TYPE_USER,
  selectChannelTypes,
  selectLimits,
} from "@/lib/message/schema";
import {
  describeValueLimits,
  initialSelectFlow,
  newSelectOption,
  selectFlowOptions,
  selectTypeOptions,
} from "@/lib/message/select";
import { FlowData } from "@/lib/flow/dataSchema";
import { entryOptionHandleId, pruneSelectOptionEdges } from "@/lib/flow/selectHandles";
import MessageInput from "./MessageInput";
import MessageSelectOptions from "./MessageSelectOptions";
import MessageComponentAccess from "./MessageComponentAccess";
import FlowDialog from "../flow/FlowDialog";
import FlowPreview from "../flow/FlowPreview";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { InfoIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useValidationErrors } from "@/lib/message/state";

function validationPathFor(path: number[]): string {
  return "components." + path.join(".components.");
}

// MessageComponentSelectMenu edits a select menu addressed by its path in the
// component tree ([row, 0] for classic messages, deeper for Components V2).
export default function MessageComponentSelectMenu({
  path,
  disableFlowEditor,
}: {
  path: number[];
  // Set when the message is sent by a flow node: branches are then wired on the
  // message node instead of in a separate flow.
  disableFlowEditor?: boolean;
}) {
  const select = useCurrentMessage(useShallow((s) => s.getComponentAtPath(path)));
  const updateAtPath = useCurrentMessage((s) => s.updateComponentAtPath);
  const validationPath = validationPathFor(path);

  const patch = useCallback(
    (p: Record<string, any>) => updateAtPath(path, p),
    [updateAtPath, path]
  );

  if (!select) return null;

  const isString = select.type === SELECT_TYPE_STRING;
  const { min, max } = selectLimits(select);

  return (
    <div className="space-y-4">
      <SelectTypeInput select={select} path={path} />

      <MessageInput
        type="text"
        label="Chữ gợi ý (placeholder)"
        description="Hiển thị trong menu khi chưa chọn gì."
        maxLength={SELECT_MAX_PLACEHOLDER}
        value={select.placeholder ?? ""}
        onChange={(v) => patch({ placeholder: v })}
        validationPath={`${validationPath}.placeholder`}
        placeholders
      />

      <div className="space-y-2">
        <div className="flex gap-3">
          <NumberInput
            label="Chọn tối thiểu"
            value={min}
            min={0}
            max={SELECT_MAX_VALUES}
            onChange={(v) => patch({ min_values: v })}
            validationPath={`${validationPath}.min_values`}
          />
          <NumberInput
            label="Chọn tối đa"
            value={max}
            min={1}
            max={SELECT_MAX_VALUES}
            onChange={(v) => patch({ max_values: v })}
            validationPath={`${validationPath}.max_values`}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {describeValueLimits(min, max)}
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-none">
          <MessageInput
            type="toggle"
            label="Vô hiệu hóa"
            value={!!select.disabled}
            onChange={(v) => patch({ disabled: v || undefined })}
          />
        </div>
        <div className="flex-none">
          <MessageInput
            type="toggle"
            label="Đặt lại sau khi chọn"
            description="Menu trở về chữ gợi ý sau mỗi lần chọn, để có thể chọn lại cùng mục."
            value={!!select.reset_on_select}
            onChange={(v) => patch({ reset_on_select: v || undefined })}
          />
        </div>
      </div>

      {isString ? (
        <StringSelectOptions
          select={select}
          path={path}
          allowOptionsSource={!!disableFlowEditor}
        />
      ) : (
        <EntitySelectSettings select={select} path={path} />
      )}

      <MessageComponentAccess
        access={select.access}
        onChange={(access) => patch({ access })}
        validationPath={`${validationPath}.access`}
        sentByFlow={disableFlowEditor}
      />

      {disableFlowEditor ? (
        <div className="flex gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
          <InfoIcon className="h-4 w-4 flex-none mt-0.5" />
          <div>
            Nối hành động từ các chấm bên dưới khối tin nhắn trong luồng: một
            chấm cho &quot;mọi lựa chọn&quot; và một chấm cho mỗi lựa chọn.
          </div>
        </div>
      ) : (
        <SelectFlowEditor select={select} />
      )}
    </div>
  );
}

function SelectTypeInput({ select, path }: { select: any; path: number[] }) {
  const updateAtPath = useCurrentMessage((s) => s.updateComponentAtPath);
  const pruneEdges = useCurrentFlow((s) => s.pruneSelectOptionEdges);

  const onChange = (v: string) => {
    const type = parseInt(v);
    if (type === select.type) return;

    const hasOptions = select.type === SELECT_TYPE_STRING && select.options?.length;
    if (
      hasOptions &&
      !window.confirm(
        "Các lựa chọn và nhánh hành động theo từng lựa chọn sẽ bị xóa. Nhánh 'Mọi lựa chọn' được giữ lại. Tiếp tục?"
      )
    ) {
      return;
    }

    updateAtPath(path, {
      type,
      options: type === SELECT_TYPE_STRING ? [newSelectOption()] : undefined,
      options_source: undefined,
      default_values: undefined,
      channel_types: undefined,
    });
    if (select.flow_source_id) {
      pruneEdges(select.flow_source_id, []);
    }
  };

  return (
    <MessageInput
      type="select"
      label="Loại menu"
      description={selectTypeOptions.find((o) => o.value === select.type)?.description}
      value={select.type.toString()}
      options={selectTypeOptions.map((o) => ({
        value: o.value.toString(),
        label: o.label,
      }))}
      placeholder="Chọn loại menu"
      onChange={onChange}
    />
  );
}

function StringSelectOptions({
  select,
  path,
  allowOptionsSource,
}: {
  select: any;
  path: number[];
  allowOptionsSource: boolean;
}) {
  const updateAtPath = useCurrentMessage((s) => s.updateComponentAtPath);
  const pruneEdges = useCurrentFlow((s) => s.pruneSelectOptionEdges);
  const flow = useCurrentFlow((s) => s.getFlow(select.flow_source_id ?? ""));
  const validationPath = validationPathFor(path);
  const optionsError = useValidationErrors(
    (s) => s.getIssueByPath(`${validationPath}.options`)?.message
  );

  const branchCounts = useMemo(() => {
    if (!flow) return undefined;
    const counts: Record<number, number> = {};
    for (const option of select.options ?? []) {
      counts[option.id] = flow.edges.filter(
        (e) => e.sourceHandle === entryOptionHandleId(option.id)
      ).length;
    }
    return counts;
  }, [flow, select.options]);

  const setOptions = (options: any[]) => {
    updateAtPath(path, { options });
    if (select.flow_source_id) {
      pruneEdges(
        select.flow_source_id,
        options.map((o) => o.id)
      );
    }
  };

  const dynamic = !!select.options_source;

  return (
    <div className="space-y-3">
      {allowOptionsSource && (
        <MessageInput
          type="select"
          label="Nguồn lựa chọn"
          value={dynamic ? "source" : "static"}
          options={[
            { value: "static", label: "Danh sách cố định" },
            { value: "source", label: "Tạo từ danh sách khi gửi" },
          ]}
          placeholder="Chọn"
          onChange={(v) =>
            updateAtPath(
              path,
              v === "source"
                ? {
                    options: [],
                    options_source: {
                      items: "",
                      label: "{{item}}",
                      value: "{{item}}",
                    },
                  }
                : { options: [newSelectOption()], options_source: undefined }
            )
          }
        />
      )}

      {dynamic ? (
        <OptionsSourceInputs select={select} path={path} />
      ) : (
        <MessageSelectOptions
          options={select.options ?? []}
          onChange={setOptions}
          validationPath={`${validationPath}.options`}
          branchCounts={branchCounts}
        />
      )}
      {optionsError && <div className="text-sm text-red-500">{optionsError}</div>}
    </div>
  );
}

function OptionsSourceInputs({ select, path }: { select: any; path: number[] }) {
  const updateAtPath = useCurrentMessage((s) => s.updateComponentAtPath);
  const source = select.options_source;
  const validationPath = `${validationPathFor(path)}.options_source`;

  const set = (p: Record<string, string | undefined>) =>
    updateAtPath(path, { options_source: { ...source, ...p } });

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Mỗi phần tử của danh sách thành một lựa chọn (tối đa 25). Dùng{" "}
        <code>{"{{item}}"}</code> cho phần tử và <code>{"{{index}}"}</code> cho
        vị trí. Lựa chọn tạo tự động không có nhánh riêng; dùng nhánh &quot;Mọi
        lựa chọn&quot; với <code>{"{{select.value}}"}</code>.
      </div>
      <MessageInput
        type="text"
        label="Danh sách nguồn"
        value={source.items}
        onChange={(v) => set({ items: v })}
        validationPath={`${validationPath}.items`}
        placeholders
      />
      <MessageInput
        type="text"
        label="Nhãn"
        value={source.label}
        onChange={(v) => set({ label: v })}
        validationPath={`${validationPath}.label`}
        placeholders
      />
      <MessageInput
        type="text"
        label="Giá trị"
        value={source.value}
        onChange={(v) => set({ value: v })}
        validationPath={`${validationPath}.value`}
        placeholders
      />
      <MessageInput
        type="text"
        label="Mô tả"
        value={source.description ?? ""}
        onChange={(v) => set({ description: v || undefined })}
        placeholders
      />
    </div>
  );
}

const defaultValueTypeFor: Record<number, "user" | "role" | "channel"> = {
  [SELECT_TYPE_USER]: "user",
  [SELECT_TYPE_ROLE]: "role",
  [SELECT_TYPE_CHANNEL]: "channel",
};

function EntitySelectSettings({ select, path }: { select: any; path: number[] }) {
  const updateAtPath = useCurrentMessage((s) => s.updateComponentAtPath);
  const validationPath = validationPathFor(path);
  const defaults: { id: string; type: "user" | "role" | "channel" }[] =
    select.default_values ?? [];
  const defaultsError = useValidationErrors(
    (s) => s.getIssueByPath(`${validationPath}.default_values`)?.message
  );

  const setDefaults = (next: typeof defaults) =>
    updateAtPath(path, { default_values: next.length ? next : undefined });

  const isMentionable = select.type === SELECT_TYPE_MENTIONABLE;

  return (
    <div className="space-y-4">
      {select.type === SELECT_TYPE_CHANNEL && (
        <div className="space-y-2">
          <Label className="text-base">Loại kênh được hiển thị</Label>
          <div className="text-sm text-muted-foreground">
            Không chọn gì để hiển thị mọi loại kênh.
          </div>
          <div className="grid grid-cols-2 gap-2">
            {selectChannelTypes.map((t) => {
              const checked = (select.channel_types ?? []).includes(t.value);
              return (
                <label key={t.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const current: number[] = select.channel_types ?? [];
                      const next = v
                        ? [...current, t.value]
                        : current.filter((c) => c !== t.value);
                      updateAtPath(path, {
                        channel_types: next.length ? next : undefined,
                      });
                    }}
                  />
                  {t.label}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-base">Chọn sẵn mặc định</Label>
        <div className="text-sm text-muted-foreground">
          Nhập ID hoặc biến, ví dụ <code>{"{{user.id}}"}</code> để chọn sẵn
          người dùng đang tương tác (chỉ khi tin nhắn được gửi bằng luồng).
        </div>
        {defaults.map((d, i) => (
          <div key={i} className="flex gap-2 items-center">
            {isMentionable && (
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={d.type}
                onChange={(e) =>
                  setDefaults(
                    defaults.map((x, j) =>
                      j === i ? { ...x, type: e.target.value as "user" | "role" } : x
                    )
                  )
                }
              >
                <option value="user">Người dùng</option>
                <option value="role">Vai trò</option>
              </select>
            )}
            <Input
              value={d.id}
              placeholder="ID"
              onChange={(e) =>
                setDefaults(
                  defaults.map((x, j) => (j === i ? { ...x, id: e.target.value } : x))
                )
              }
            />
            <TrashIcon
              className="h-4 w-4 flex-none text-muted-foreground"
              role="button"
              onClick={() => setDefaults(defaults.filter((_, j) => j !== i))}
            />
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setDefaults([
              ...defaults,
              { id: "", type: defaultValueTypeFor[select.type] ?? "user" },
            ])
          }
          disabled={defaults.length >= SELECT_MAX_VALUES}
        >
          <PlusIcon className="h-4 w-4 mr-1" /> Thêm giá trị mặc định
        </Button>
        {defaultsError && <div className="text-sm text-red-500">{defaultsError}</div>}
      </div>
    </div>
  );
}

function SelectFlowEditor({ select }: { select: any }) {
  const flowSourceId: string | undefined = select.flow_source_id;
  const [flowData, replaceFlow] = useCurrentFlow(
    useShallow((s) => [s.getFlow(flowSourceId || ""), s.replaceFlow])
  );

  const componentOptions = useMemo(() => selectFlowOptions(select), [select]);

  const onFlowDialogClose = useCallback(
    (d: FlowData) => {
      if (!flowSourceId) return;
      // Branches of options deleted while the dialog was open are dropped.
      replaceFlow(
        flowSourceId,
        pruneSelectOptionEdges(
          d,
          componentOptions.map((o) => o.id)
        )
      );
    },
    [replaceFlow, flowSourceId, componentOptions]
  );

  return (
    <div className="space-y-2">
      <Label className="text-base">Hành động khi chọn</Label>
      <div className="text-sm text-muted-foreground">
        Nhánh &quot;Mọi lựa chọn&quot; chạy trước, sau đó là nhánh của từng lựa
        chọn được chọn. Phản hồi (trả lời, sửa tin nhắn…) cấu hình trong luồng.
      </div>
      <FlowDialog
        flowData={flowData || initialSelectFlow()}
        context="component_select"
        componentOptions={componentOptions}
        onClose={onFlowDialogClose}
      >
        <FlowPreview
          className="h-48 p-10 w-full"
          entryType="entry_component_select"
          onClick={() => {}}
        />
      </FlowDialog>
    </div>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
  validationPath,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  validationPath: string;
}) {
  const error = useValidationErrors(
    (s) => s.getIssueByPath(validationPath)?.message
  );

  return (
    <div className="space-y-1 w-full">
      <Label className="text-base">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
      />
      {error && <div className="text-sm text-red-500">{error}</div>}
    </div>
  );
}
