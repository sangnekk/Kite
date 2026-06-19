import { Panel, useReactFlow } from "@xyflow/react";
import { useState } from "react";
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  LinkIcon,
  SettingsIcon,
} from "lucide-react";
import { useFlowIssues } from "@/lib/flow/validate";
import { cn } from "@/lib/utils";

export default function FlowValidationPanel() {
  const issues = useFlowIssues();
  const { fitView } = useReactFlow();
  const [open, setOpen] = useState(false);

  if (issues.length === 0) return null;

  const focusNode = (nodeId: string) => {
    setOpen(false);
    fitView({ nodes: [{ id: nodeId }], duration: 400, maxZoom: 1.2 });
  };

  return (
    <Panel
      position="top-center"
      className="!m-2 max-w-[calc(100vw-1rem)]"
    >
      <div className="overflow-hidden rounded-lg border border-amber-500/40 bg-background/95 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
        >
          <AlertTriangleIcon className="h-4 w-4 flex-none text-amber-500" />
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {issues.length} vấn đề
          </span>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 flex-none text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {open && (
          <div className="max-h-[40dvh] w-72 max-w-[calc(100vw-1rem)] divide-y overflow-y-auto border-t">
            {issues.map((issue, i) => (
              <button
                type="button"
                key={`${issue.nodeId}-${issue.kind}-${i}`}
                onClick={() => focusNode(issue.nodeId)}
                className="flex w-full items-start gap-2 px-2.5 py-2 text-left hover:bg-muted/60"
              >
                {issue.kind === "disconnected" ? (
                  <LinkIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-red-500" />
                ) : (
                  <SettingsIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-red-500" />
                )}
                <span className="text-xs leading-snug text-muted-foreground">
                  {issue.message}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
