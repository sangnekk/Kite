import { useQuery } from "@tanstack/react-query"
import { Navigate, useParams } from "react-router"
import { DetailSkeleton, ErrorState } from "@/components/common/Misc"
import { api } from "@/lib/api"
import type { SettingsGroups } from "@/lib/types"
import { AIEditor } from "./AIEditor"
import { GroupForm } from "./GroupForm"
import { GROUP_BY_ID, SETTINGS_KEY } from "./groups"

export function Component() {
  const { group = "" } = useParams()
  const spec = GROUP_BY_ID[group]

  const settings = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: ({ signal }) => api<SettingsGroups>("/settings", { signal }),
    staleTime: 0,
  })

  if (!spec) return <Navigate to="/settings" replace />
  if (settings.isPending) return <DetailSkeleton />
  if (settings.error) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />

  const data = settings.data[group]
  if (!data) return <ErrorState error={new Error("Máy chủ không trả về nhóm cài đặt này")} />

  // Remount when the group changes or the server copy changes, so the form
  // always starts from what is really stored.
  const version = JSON.stringify([group, data.values, data.secrets_set])
  return group === "ai" ? (
    <AIEditor key={version} spec={spec} data={data} />
  ) : (
    <GroupForm key={version} spec={spec} data={data} />
  )
}
