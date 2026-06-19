import { LinkIcon } from "lucide-react";
import { useNodeIssues } from "@/lib/flow/validate";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  id: string;
  showConnectedMarker?: boolean;
}

export default function FlowNodeMarkers({
  id,
  showConnectedMarker = true,
}: Props) {
  const issues = useNodeIssues(id);

  const disconnected = showConnectedMarker
    ? issues.find((issue) => issue.kind === "disconnected")
    : undefined;
  const config = issues.find((issue) => issue.kind === "config");

  if (!disconnected && !config) return null;

  return (
    <div className="absolute -top-2 -right-2 flex space-x-1">
      {disconnected && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center cursor-help">
              <LinkIcon className="h-2.5 w-2.5 text-white" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-60">
            {disconnected.message}
          </TooltipContent>
        </Tooltip>
      )}
      {config && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-medium leading-4 cursor-help">
              !
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-60">{config.message}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
