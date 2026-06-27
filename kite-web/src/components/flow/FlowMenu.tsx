import { LogEntry } from "@/lib/types/wire.gen";
import { cn } from "@/lib/utils";
import {
  BoxIcon,
  DatabaseIcon,
  GitCompareIcon,
  LucideIcon,
  MessageSquareWarningIcon,
  PlugIcon,
  TextCursorInputIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import FlowLogList from "./FlowLogList";
import FlowNodeEditor from "./FlowNodeEditor";
import FlowNodeExplorer from "./FlowNodeExplorer";
import { useStoreApi } from "@xyflow/react";

type Tab =
  | "action"
  | "data"
  | "control_flow"
  | "option"
  | "integration"
  | "logs";

export default function FlowMenu({
  selectedNodeId,
  logs,
}: {
  selectedNodeId: string | null;
  logs?: LogEntry[];
}) {
  const [tab, setTab] = useState<Tab | null>("action");

  // On phones the panel overlays the canvas, so start collapsed — otherwise it
  // covers the flow and blocks touch (you can't drag nodes underneath it).
  const isMobile = useIsMobile();
  const autoCollapsed = useRef(false);
  useEffect(() => {
    if (isMobile && !autoCollapsed.current) {
      autoCollapsed.current = true;
      setTab(null);
    }
  }, [isMobile]);

  const store = useStoreApi();

  const wrappedSetTab = useCallback(
    (next: Tab) => {
      // Tapping the active tab again collapses the panel so the canvas is
      // visible — essential on phones where the panel overlays the flow.
      setTab((prev) => (prev === next ? null : next));
      store.getState().addSelectedNodes([]);
    },
    [store, setTab]
  );

  const panelVisible = tab !== null || !!selectedNodeId;

  return (
    <div className="flex flex-none">
      <div className="flex-none flex flex-col justify-between bg-muted/50 z-30">
        <div className="flex-none flex flex-col items-center gap-1">
          <Tab
            id="action"
            icon={BoxIcon}
            title="Khối hành động"
            tab={tab}
            setTab={wrappedSetTab}
          />
          <Tab
            id="data"
            icon={DatabaseIcon}
            title="Khối dữ liệu & tiện ích"
            tab={tab}
            setTab={wrappedSetTab}
          />
          <Tab
            id="control_flow"
            icon={GitCompareIcon}
            title="Khối điều khiển"
            tab={tab}
            setTab={wrappedSetTab}
          />
          <Tab
            id="option"
            icon={TextCursorInputIcon}
            title="Khối tùy chọn"
            tab={tab}
            setTab={wrappedSetTab}
          />
          <Tab
            id="integration"
            icon={PlugIcon}
            title="Khối tích hợp"
            tab={tab}
            setTab={wrappedSetTab}
          />
        </div>
        <div className="flex-none flex flex-col items-center gap-1">
          <Tab
            id="logs"
            icon={MessageSquareWarningIcon}
            title="Nhật ký"
            tab={tab}
            setTab={wrappedSetTab}
          />
        </div>
      </div>
      {panelVisible && (
        <div className="flex-none w-96 max-w-[calc(100vw-3.5rem)] bg-muted/30 absolute inset-y-0 left-14 z-20 md:relative md:inset-y-auto md:left-auto md:z-auto md:max-w-none">
          {(tab === "action" ||
            tab === "data" ||
            tab === "control_flow" ||
            tab === "option" ||
            tab === "integration") && <FlowNodeExplorer category={tab} />}

          {tab === "logs" && <FlowLogList logs={logs} />}

          {selectedNodeId && <FlowNodeEditor nodeId={selectedNodeId} />}
        </div>
      )}
    </div>
  );
}

function Tab({
  id,
  icon: Icon,
  title,
  tab,
  setTab,
}: {
  id: Tab;
  icon: LucideIcon;
  title: string;
  tab: Tab | null;
  setTab: (tab: Tab) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <div
          className={cn(
            "p-3 cursor-pointer",
            tab === id
              ? "text-foreground bg-background/50 border-l-[3px] border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-background/20"
          )}
          onClick={() => setTab(id)}
          role="button"
        >
          <Icon className="size-8" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}
