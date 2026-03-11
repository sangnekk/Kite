import FlowPage from "@/components/flow/FlowPage";
import { useEventListenerUpdateMutation } from "@/lib/api/mutations";
import { FlowData } from "@/lib/flow/dataSchema";
import { useEventListener, useResponseData } from "@/lib/hooks/api";
import { useAppId, useEventId } from "@/lib/hooks/params";
import { useBeforePageExit } from "@/lib/hooks/exit";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { LogEntryListDrawer } from "@/components/app/LogEntryListDrawer";
import { useLogEntriesQuery } from "@/lib/api/queries";

export default function AppEventListenerPage() {
  const ignoreChange = useRef(false);

  const router = useRouter();
  const listener = useEventListener((res) => {
    if (!res.success) {
      toast.error(
        `Tải sự kiện thất bại: ${res?.error.message} (${res?.error.code})`
      );
      if (res.error.code === "unknown_event_listener") {
        router.push({
          pathname: "/apps/[appId]/events",
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

  const updateMutation = useEventListenerUpdateMutation(
    useAppId(),
    useEventId()
  );

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

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
                "Sự kiện đã lưu! Có thể mất đến một phút để tất cả thay đổi có hiệu lực."
              );
            } else {
              toast.error(
                `Cập nhật sự kiện thất bại: ${res.error.message} (${res.error.code})`
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
      if (
        !confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn thoát không?")
      ) {
        return;
      }
    }

    router.push({
      pathname: "/apps/[appId]/events",
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
    eventId: useEventId(),
    refetchInterval: 10000,
  });
  const logs = useResponseData(logsQuery);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <Head>
        <title>Quản lý sự kiện | Vibe Bot</title>
      </Head>
      {listener && (
        <FlowPage
          flowData={listener.flow_source}
          context="event_discord"
          hasUnsavedChanges={hasUnsavedChanges}
          onChange={onChange}
          isSaving={isSaving}
          onSave={save}
          onExit={exit}
          logs={logs}
        />
      )}
      <LogEntryListDrawer
        eventId={listener?.id}
        open={logsOpen}
        onOpenChange={setLogsOpen}
      />
    </div>
  );
}
