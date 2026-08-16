import { Position } from "@xyflow/react";
import { NodeProps } from "../../lib/flow/dataSchema";
import FlowNodeBase from "./FlowNodeBase";
import FlowNodeHandle from "./FlowNodeHandle";

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function describeSchedule(data: Record<string, unknown>): string {
  const type = data.schedule_type as string | undefined;
  const tz = (data.schedule_timezone as string) || "Asia/Ho_Chi_Minh";

  switch (type) {
    case "interval": {
      const seconds = (data.schedule_interval_seconds as number) || 0;
      if (seconds % 3600 === 0 && seconds >= 3600) {
        return `Mỗi ${seconds / 3600} giờ`;
      }
      if (seconds % 60 === 0) {
        return `Mỗi ${seconds / 60} phút`;
      }
      return `Mỗi ${seconds} giây`;
    }
    case "daily":
      return `Hằng ngày lúc ${data.schedule_time} (${tz})`;
    case "weekly": {
      const days = ((data.schedule_weekdays as number[]) || [])
        .map((d) => WEEKDAY_LABELS[d] ?? d)
        .join(", ");
      return `Hằng tuần vào ${days} lúc ${data.schedule_time} (${tz})`;
    }
    case "cron":
      return `Cron "${data.schedule_cron_expression}" (${tz})`;
    default:
      return "Chạy theo lịch";
  }
}

export default function FlowNodeEntrySchedule(props: NodeProps) {
  const summary = describeSchedule(props.data);

  return (
    <FlowNodeBase
      {...props}
      title="Lịch biểu"
      description={`${summary}. Thả các hành động vào đây!`}
      highlight={true}
      showConnectedMarker={false}
    >
      <FlowNodeHandle type="source" position={Position.Bottom} />
    </FlowNodeBase>
  );
}
