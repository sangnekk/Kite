import { useCurrentFlow, useCurrentMessage } from "@/lib/message/state";
import { useShallow } from "zustand/react/shallow";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { getUniqueId } from "@/lib/utils";
import { useCallback } from "react";
import MessageInput from "./MessageInput";
import MessageEmojiPicker from "./MessageEmojiPicker";
import MessageCollapsibleSection from "./MessageCollapsibleSection";
import FlowDialog from "../flow/FlowDialog";
import FlowPreview from "../flow/FlowPreview";
import { FlowData } from "@/lib/flow/dataSchema";
import { Emoji } from "@/lib/message/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import MediaInput from "./MessageMediaInput";

const initialButtonFlow = {
  nodes: [
    {
      id: getUniqueId().toString(),
      position: { x: 0, y: 0 },
      data: {},
      type: "entry_component_button",
    },
  ],
  edges: [],
};

// Components that can be added at the top level / inside a container.
const ADDABLE: { label: string; type: number }[] = [
  { label: "Văn bản", type: 10 },
  { label: "Phần", type: 9 },
  { label: "Thư viện ảnh/video", type: 12 },
  { label: "Đường phân cách", type: 14 },
  { label: "Hàng nút", type: 1 },
];

const TOP_LEVEL_ADDABLE = [{ label: "Khung chứa", type: 17 }, ...ADDABLE];

function newComponent(type: number): any {
  const id = getUniqueId();
  switch (type) {
    case 10:
      return { id, type: 10, content: "" };
    case 14:
      return { id, type: 14, divider: true, spacing: 1 };
    case 11:
      return { id, type: 11, media: { url: "" } };
    case 12:
      return { id, type: 12, items: [{ media: { url: "" } }] };
    case 9:
      return {
        id,
        type: 9,
        components: [{ id: getUniqueId(), type: 10, content: "" }],
        accessory: {
          id: getUniqueId(),
          type: 2,
          style: 2,
          label: "Nút",
          flow_source_id: getUniqueId().toString(),
        },
      };
    case 1:
      return { id, type: 1, components: [] };
    case 17:
    default:
      return { id, type: 17, components: [] };
  }
}

function validationPathFor(path: number[]): string {
  return "components." + path.join(".components.");
}

// ---------------------------------------------------------------------------

export default function MessageV2Editor({
  disableFlowEditor,
}: {
  disableFlowEditor?: boolean;
}) {
  const componentIds = useCurrentMessage(
    useShallow((state) => state.components.map((c) => (c as any).id))
  );

  return (
    <div className="space-y-3">
      {componentIds.map((id, i) => (
        <V2ComponentEditor
          key={id}
          path={[i]}
          disableFlowEditor={disableFlowEditor}
        />
      ))}
      <AddComponentMenu parentPath={[]} options={TOP_LEVEL_ADDABLE} />
    </div>
  );
}

function AddComponentMenu({
  parentPath,
  options,
}: {
  parentPath: number[];
  options: { label: string; type: number }[];
}) {
  const addComponent = useCurrentMessage((s) => s.addComponentAtPath);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon className="h-4 w-4 mr-1" /> Thêm thành phần
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((o) => (
          <DropdownMenuItem
            key={o.type}
            onClick={() => addComponent(parentPath, newComponent(o.type))}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ComponentHeader({
  path,
  title,
  childActions,
}: {
  path: number[];
  title: string;
  childActions?: React.ReactNode;
}) {
  const [move, duplicate, remove] = useCurrentMessage(
    useShallow((s) => [
      s.moveComponentAtPath,
      s.duplicateComponentAtPath,
      s.deleteComponentAtPath,
    ])
  );
  const index = path[path.length - 1];

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="font-medium text-muted-foreground">{title}</div>
      <div className="flex items-center gap-2 text-muted-foreground">
        {childActions}
        {index > 0 && (
          <ChevronUpIcon
            className="h-5 w-5"
            role="button"
            onClick={() => move(path, -1)}
          />
        )}
        <ChevronDownIcon
          className="h-5 w-5"
          role="button"
          onClick={() => move(path, 1)}
        />
        <CopyIcon
          className="h-4 w-4"
          role="button"
          onClick={() => duplicate(path)}
        />
        <TrashIcon
          className="h-4 w-4"
          role="button"
          onClick={() => remove(path)}
        />
      </div>
    </div>
  );
}

function V2ComponentEditor({
  path,
  disableFlowEditor,
}: {
  path: number[];
  disableFlowEditor?: boolean;
}) {
  const component = useCurrentMessage(
    useShallow((s) => s.getComponentAtPath(path))
  );

  if (!component) return null;

  switch (component.type) {
    case 17:
      return (
        <ContainerEditor
          path={path}
          component={component}
          disableFlowEditor={disableFlowEditor}
        />
      );
    case 10:
      return <TextDisplayEditor path={path} component={component} />;
    case 14:
      return <SeparatorEditor path={path} component={component} />;
    case 9:
      return (
        <SectionEditor
          path={path}
          component={component}
          disableFlowEditor={disableFlowEditor}
        />
      );
    case 11:
      return <ThumbnailEditor path={path} component={component} />;
    case 12:
      return <MediaGalleryEditor path={path} component={component} />;
    case 1:
      return (
        <ActionRowEditor
          path={path}
          component={component}
          disableFlowEditor={disableFlowEditor}
        />
      );
    default:
      return null;
  }
}

function ContainerEditor({
  path,
  component,
  disableFlowEditor,
}: {
  path: number[];
  component: any;
  disableFlowEditor?: boolean;
}) {
  const update = useCurrentMessage((s) => s.updateComponentAtPath);
  const childIds: number[] = (component.components ?? []).map(
    (c: any) => c.id
  );

  return (
    <Card
      className="p-3 border-l-4"
      style={{
        borderLeftColor: component.accent_color
          ? `#${component.accent_color.toString(16).padStart(6, "0")}`
          : undefined,
      }}
    >
      <ComponentHeader path={path} title="Khung chứa" />
      <div className="flex gap-3 mb-3">
        <MessageInput
          type="color"
          label="Màu nhấn"
          value={component.accent_color}
          onChange={(v) => update(path, { accent_color: v })}
        />
        <div className="flex-none">
          <MessageInput
            type="toggle"
            label="Ẩn nội dung"
            value={!!component.spoiler}
            onChange={(v) => update(path, { spoiler: v || undefined })}
          />
        </div>
      </div>
      <div className="space-y-3 pl-3 border-l border-dashed">
        {childIds.map((id, i) => (
          <V2ComponentEditor
            key={id}
            path={[...path, i]}
            disableFlowEditor={disableFlowEditor}
          />
        ))}
        <AddComponentMenu parentPath={path} options={ADDABLE} />
      </div>
    </Card>
  );
}

function TextDisplayEditor({
  path,
  component,
}: {
  path: number[];
  component: any;
}) {
  const update = useCurrentMessage((s) => s.updateComponentAtPath);
  return (
    <Card className="p-3">
      <ComponentHeader path={path} title="Văn bản" />
      <MessageInput
        type="textarea"
        label="Nội dung"
        value={component.content || ""}
        onChange={(v) => update(path, { content: v })}
        validationPath={`${validationPathFor(path)}.content`}
        placeholders
      />
    </Card>
  );
}

function SeparatorEditor({
  path,
  component,
}: {
  path: number[];
  component: any;
}) {
  const update = useCurrentMessage((s) => s.updateComponentAtPath);
  return (
    <Card className="p-3">
      <ComponentHeader path={path} title="Đường phân cách" />
      <div className="flex gap-3">
        <MessageInput
          type="select"
          label="Khoảng cách"
          placeholder="Khoảng cách"
          value={(component.spacing ?? 1).toString()}
          options={[
            { label: "Nhỏ", value: "1" },
            { label: "Lớn", value: "2" },
          ]}
          onChange={(v) => update(path, { spacing: parseInt(v) })}
        />
        <div className="flex-none">
          <MessageInput
            type="toggle"
            label="Hiển thị vạch kẻ"
            value={component.divider !== false}
            onChange={(v) => update(path, { divider: v })}
          />
        </div>
      </div>
    </Card>
  );
}

function ThumbnailEditor({
  path,
  component,
}: {
  path: number[];
  component: any;
}) {
  const update = useCurrentMessage((s) => s.updateComponentAtPath);
  return (
    <Card className="p-3">
      <ComponentHeader path={path} title="Hình thu nhỏ" />
      <MediaInput
        media={component.media}
        onChange={(media) => update(path, { media })}
      />
      <div className="flex gap-3 mt-3">
        <MessageInput
          type="text"
          label="Mô tả (văn bản thay thế)"
          value={component.description || ""}
          onChange={(v) => update(path, { description: v || undefined })}
        />
        <div className="flex-none">
          <MessageInput
            type="toggle"
            label="Ẩn nội dung"
            value={!!component.spoiler}
            onChange={(v) => update(path, { spoiler: v || undefined })}
          />
        </div>
      </div>
    </Card>
  );
}

function MediaGalleryEditor({
  path,
  component,
}: {
  path: number[];
  component: any;
}) {
  const [addItem, updateItem, deleteItem, moveItem] = useCurrentMessage(
    useShallow((s) => [
      s.addMediaGalleryItem,
      s.updateMediaGalleryItem,
      s.deleteMediaGalleryItem,
      s.moveMediaGalleryItem,
    ])
  );
  const items: any[] = component.items ?? [];

  return (
    <Card className="p-3">
      <ComponentHeader path={path} title="Thư viện ảnh/video" />
      <div className="space-y-3">
        {items.map((item, k) => (
          <Card key={k} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Mục {k + 1}</div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {k > 0 && (
                  <ChevronUpIcon
                    className="h-4 w-4"
                    role="button"
                    onClick={() => moveItem(path, k, -1)}
                  />
                )}
                {k < items.length - 1 && (
                  <ChevronDownIcon
                    className="h-4 w-4"
                    role="button"
                    onClick={() => moveItem(path, k, 1)}
                  />
                )}
                <TrashIcon
                  className="h-4 w-4"
                  role="button"
                  onClick={() => deleteItem(path, k)}
                />
              </div>
            </div>
            <MediaInput
              media={item.media}
              onChange={(media) => updateItem(path, k, { media })}
            />
            <div className="flex gap-3 mt-3">
              <MessageInput
                type="text"
                label="Mô tả"
                value={item.description || ""}
                onChange={(v) =>
                  updateItem(path, k, { description: v || undefined })
                }
              />
              <div className="flex-none">
                <MessageInput
                  type="toggle"
                  label="Ẩn nội dung"
                  value={!!item.spoiler}
                  onChange={(v) =>
                    updateItem(path, k, { spoiler: v || undefined })
                  }
                />
              </div>
            </div>
          </Card>
        ))}
        {items.length < 10 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => addItem(path, { media: { url: "" } })}
          >
            <PlusIcon className="h-4 w-4 mr-1" /> Thêm mục
          </Button>
        )}
      </div>
    </Card>
  );
}

function SectionEditor({
  path,
  component,
  disableFlowEditor,
}: {
  path: number[];
  component: any;
  disableFlowEditor?: boolean;
}) {
  const [addComponent, setAccessory] = useCurrentMessage(
    useShallow((s) => [s.addComponentAtPath, s.setSectionAccessory])
  );
  const textIds: number[] = (component.components ?? []).map(
    (c: any) => c.id
  );
  const accessory = component.accessory;

  const switchAccessory = useCallback(
    (kind: "button" | "thumbnail") => {
      if (kind === "button") {
        setAccessory(path, {
          id: getUniqueId(),
          type: 2,
          style: 2,
          label: "Nút",
          flow_source_id: getUniqueId().toString(),
        } as any);
      } else {
        setAccessory(path, {
          id: getUniqueId(),
          type: 11,
          media: { url: "" },
        } as any);
      }
    },
    [path, setAccessory]
  );

  return (
    <Card className="p-3">
      <ComponentHeader path={path} title="Phần" />
      <div className="flex gap-4">
        <div className="flex-1 space-y-3 min-w-0">
          {textIds.map((id, i) => (
            <V2ComponentEditor key={id} path={[...path, i]} />
          ))}
          {textIds.length < 3 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                addComponent(path, {
                  id: getUniqueId(),
                  type: 10,
                  content: "",
                })
              }
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Thêm văn bản
            </Button>
          )}
        </div>
        <div className="w-64 flex-none">
          <div className="flex gap-2 mb-2">
            <Button
              size="sm"
              variant={accessory?.type === 2 ? "default" : "outline"}
              onClick={() => switchAccessory("button")}
            >
              Nút
            </Button>
            <Button
              size="sm"
              variant={accessory?.type === 11 ? "default" : "outline"}
              onClick={() => switchAccessory("thumbnail")}
            >
              Hình thu nhỏ
            </Button>
          </div>
          {accessory?.type === 2 ? (
            <ButtonEditor
              button={accessory}
              path={path}
              accessory
              disableFlowEditor={disableFlowEditor}
            />
          ) : accessory?.type === 11 ? (
            <AccessoryThumbnailEditor path={path} accessory={accessory} />
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function AccessoryThumbnailEditor({
  path,
  accessory,
}: {
  path: number[];
  accessory: any;
}) {
  const setAccessory = useCurrentMessage((s) => s.setSectionAccessory);
  return (
    <div className="space-y-2">
      <MediaInput
        media={accessory.media}
        onChange={(media) =>
          setAccessory(path, { ...accessory, media } as any)
        }
      />
    </div>
  );
}

function ActionRowEditor({
  path,
  component,
  disableFlowEditor,
}: {
  path: number[];
  component: any;
  disableFlowEditor?: boolean;
}) {
  const addComponent = useCurrentMessage((s) => s.addComponentAtPath);
  const buttonIds: number[] = (component.components ?? []).map(
    (c: any) => c.id
  );

  return (
    <Card className="p-3">
      <ComponentHeader path={path} title="Hàng nút" />
      <div className="space-y-3">
        {buttonIds.map((id, i) => (
          <V2ButtonChildEditor
            key={id}
            path={[...path, i]}
            disableFlowEditor={disableFlowEditor}
          />
        ))}
        {buttonIds.length < 5 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              addComponent(path, {
                id: getUniqueId(),
                type: 2,
                style: 2,
                label: "Nút",
                flow_source_id: getUniqueId().toString(),
              })
            }
          >
            <PlusIcon className="h-4 w-4 mr-1" /> Thêm nút
          </Button>
        )}
      </div>
    </Card>
  );
}

// A button that lives inside an action row (addressed by its own path).
function V2ButtonChildEditor({
  path,
  disableFlowEditor,
}: {
  path: number[];
  disableFlowEditor?: boolean;
}) {
  const button = useCurrentMessage(
    useShallow((s) => s.getComponentAtPath(path))
  );
  if (!button) return null;
  return (
    <div className="relative">
      <ButtonEditor
        button={button}
        path={path}
        disableFlowEditor={disableFlowEditor}
        showHeader
      />
    </div>
  );
}

// Shared button editor used both for action-row buttons (updated by their own
// path) and for section accessory buttons (updated via setSectionAccessory).
function ButtonEditor({
  button,
  path,
  accessory,
  disableFlowEditor,
  showHeader,
}: {
  button: any;
  path: number[];
  accessory?: boolean;
  disableFlowEditor?: boolean;
  showHeader?: boolean;
}) {
  const [updateAtPath, setAccessory, remove] = useCurrentMessage(
    useShallow((s) => [
      s.updateComponentAtPath,
      s.setSectionAccessory,
      s.deleteComponentAtPath,
    ])
  );

  const patch = useCallback(
    (p: Record<string, any>) => {
      if (accessory) {
        setAccessory(path, { ...button, ...p } as any);
      } else {
        updateAtPath(path, p);
      }
    },
    [accessory, button, path, setAccessory, updateAtPath]
  );

  const flowSourceId: string | undefined = button.flow_source_id;
  const [flowData, replaceFlow] = useCurrentFlow(
    useShallow((s) => [s.getFlow(flowSourceId || ""), s.replaceFlow])
  );

  const onFlowDialogClose = useCallback(
    (d: FlowData) => {
      if (flowSourceId) replaceFlow(flowSourceId, d);
    },
    [replaceFlow, flowSourceId]
  );

  return (
    <Card className="p-3 space-y-3">
      {showHeader && (
        <div className="flex justify-end">
          <TrashIcon
            className="h-4 w-4 text-muted-foreground"
            role="button"
            onClick={() => remove(path)}
          />
        </div>
      )}
      <div className="flex gap-3">
        <MessageInput
          type="select"
          label="Kiểu"
          placeholder="Kiểu"
          value={(button.style ?? 2).toString()}
          options={[
            { label: "Xanh tím", value: "1" },
            { label: "Xám", value: "2" },
            { label: "Xanh lá", value: "3" },
            { label: "Đỏ", value: "4" },
            { label: "Liên kết", value: "5" },
          ]}
          onChange={(v) =>
            patch(parseInt(v) === 5 ? { style: 5, url: "" } : { style: parseInt(v) })
          }
        />
        <div className="flex-none">
          <MessageInput
            type="toggle"
            label="Vô hiệu hóa"
            value={!!button.disabled}
            onChange={(v) => patch({ disabled: v || undefined })}
          />
        </div>
      </div>
      <div className="flex gap-3">
        <MessageEmojiPicker
          emoji={button.emoji}
          onChange={(e: Emoji | undefined) => patch({ emoji: e })}
        />
        <MessageInput
          type="text"
          label="Nhãn"
          maxLength={80}
          value={button.label || ""}
          onChange={(v) => patch({ label: v })}
          placeholders
        />
      </div>
      {button.style === 5 ? (
        <MessageInput
          type="url"
          label="URL"
          value={button.url || ""}
          onChange={(v) => patch({ url: v })}
          placeholders
        />
      ) : (
        !disableFlowEditor && (
          <FlowDialog
            flowData={flowData || initialButtonFlow}
            context="component_button"
            onClose={onFlowDialogClose}
          >
            <FlowPreview className="h-48 p-10 w-full" onClick={() => {}} />
          </FlowDialog>
        )
      )}
    </Card>
  );
}
