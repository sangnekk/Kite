import FlowPage from "@/components/flow/FlowPage";
import { useScheduleUpdateMutation } from "@/lib/api/mutations";
import { FlowData } from "@/lib/flow/dataSchema";
import { useSchedule, useResponseData } from "@/lib/hooks/api";
import { useAppId, useScheduleId } from "@/lib/hooks/params";
import { useBeforePageExit } from "@/lib/hooks/exit";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useLogEntriesQuery } from "@/lib/api/queries";

export default function AppSchedulePage() {
  const ignoreChange = useRef(false);

  const router = useRouter();
  const schedule = useSchedule((res) => {
    if (!res.success) {
      toast.error(
        `Tải lịch biểu thất bại: ${res?.error.message} (${res?.error.code})`
      );
      if (res.error.code === "unknown_schedule") {
        router.push({
          pathname: "/apps/[appId]/schedules",
          query: { appId: router.query.appId },
        });
      }
    } else {
      // This is a workaround to ignore the initial change event
      ignoreChange.current = true;
      setTimeout(() => {
        ignoreChange.current = false;
      }, 100);
    }
  });

  const updateMutation = useScheduleUpdateMutation(useAppId(), useScheduleId());

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const onChange = useCallback(() => {
    if (!ignoreChange.current) {
      setHasUnsavedChanges(true);
    }
  }, [setHasUnsavedChanges, ignoreChange]);

  const save = useCallback(
    (data: FlowData) => {
      setIsSaving(true);

      updateMutation.mutate(
        {
          flow_source: data,
          enabled: true,
        },
        {
          onSuccess(res) {
            if (res.success) {
              toast.success(
                "Lịch biểu đã lưu! Có thể mất đến một phút để thay đổi có hiệu lực."
              );
            } else {
              toast.error(
                `Cập nhật lịch biểu thất bại: ${res.error.message} (${res.error.code})`
              );
            }
          },
          onSettled() {
            setIsSaving(false);
            setHasUnsavedChanges(false);
          },
        }
      );
    },
    [setIsSaving, setHasUnsavedChanges, updateMutation]
  );

  const exit = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn thoát không?")) {
        return;
      }
    }

    router.push({
      pathname: "/apps/[appId]/schedules",
      query: { appId: router.query.appId },
    });
  }, [hasUnsavedChanges, router]);

  useBeforePageExit(
    (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        return "Bạn có thay đổi chưa lưu. Bạn có chắc muốn thoát không?";
      }
    },
    [hasUnsavedChanges]
  );

  const logsQuery = useLogEntriesQuery(useAppId(), {
    limit: 10,
    scheduleId: useScheduleId(),
    refetchInterval: 10000,
  });
  const logs = useResponseData(logsQuery);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <Head>
        <title>Quản lý lịch biểu | Vibe Bot</title>
      </Head>
      {schedule && (
        <FlowPage
          flowData={schedule.flow_source}
          context="schedule"
          hasUnsavedChanges={hasUnsavedChanges}
          onChange={onChange}
          isSaving={isSaving}
          onSave={save}
          onExit={exit}
          logs={logs}
        />
      )}
    </div>
  );
}
