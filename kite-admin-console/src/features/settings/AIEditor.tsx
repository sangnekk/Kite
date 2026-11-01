import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { api, errorMessage } from "@/lib/api"
import type { SettingsGroup } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  buildAIPatch,
  emptyModel,
  emptyProvider,
  isDirty,
  toDraft,
  validateDraft,
  type AIDraft,
  type ModelDraft,
  type ProviderDraft,
} from "./aiPayload"
import { SETTINGS_KEY, type GroupSpec } from "./groups"
import { RestartNotice, SecretInput } from "./GroupForm"

const NO_DEFAULT = "__none__"

export function AIEditor({ spec, data }: { spec: GroupSpec; data: SettingsGroup }) {
  const original = useMemo(() => toDraft(data), [data])
  const [draft, setDraft] = useState<AIDraft>(() => toDraft(data))
  const [serverError, setServerError] = useState<string | null>(null)

  const problems = validateDraft(draft)
  const dirty = isDirty(draft, original)
  const modelKeys = draft.providers.flatMap((p) => p.models.map((m) => m.key.trim()).filter(Boolean))

  const save = useAdminMutation(
    () => api("/settings/ai", { method: "PUT", body: { values: buildAIPatch(draft) } }),
    { invalidate: [SETTINGS_KEY], success: "Đã lưu cài đặt AI", toastError: false }
  )

  const updateProvider = (uid: string, change: Partial<ProviderDraft>) =>
    setDraft((d) => ({ ...d, providers: d.providers.map((p) => (p.uid === uid ? { ...p, ...change } : p)) }))

  const updateModel = (uid: string, index: number, change: Partial<ModelDraft>) =>
    setDraft((d) => ({
      ...d,
      providers: d.providers.map((p) =>
        p.uid === uid ? { ...p, models: p.models.map((m, i) => (i === index ? { ...m, ...change } : m)) } : p
      ),
    }))

  async function submit() {
    setServerError(null)
    try {
      await save.mutateAsync()
    } catch (err) {
      setServerError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <RestartNotice />

      <Card>
        <CardHeader>
          <CardTitle>{spec.label}</CardTitle>
          <CardDescription>{spec.description} Nhà cung cấp không có API key sẽ bị bỏ qua khi khởi động.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Mô hình mặc định</Label>
          <Select
            value={draft.default_model || NO_DEFAULT}
            onValueChange={(v) => setDraft((d) => ({ ...d, default_model: v === NO_DEFAULT ? "" : v }))}
          >
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DEFAULT}>Mô hình đầu tiên</SelectItem>
              {modelKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {draft.providers.map((provider, pIndex) => (
        <Card key={provider.uid}>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{provider.id || `Nhà cung cấp #${pIndex + 1}`}</CardTitle>
              <CardDescription>{provider.api === "anthropic" ? "Anthropic Messages API" : "OpenAI hoặc tương thích OpenAI"}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraft((d) => ({ ...d, providers: d.providers.filter((p) => p.uid !== provider.uid) }))}
            >
              <Trash2 /> Xóa
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mã nhà cung cấp</Label>
                <Input value={provider.id} onChange={(e) => updateProvider(provider.uid, { id: e.target.value })} placeholder="openai" />
              </div>
              <div className="space-y-1.5">
                <Label>Giao thức</Label>
                <Select value={provider.api} onValueChange={(v) => updateProvider(provider.uid, { api: v as ProviderDraft["api"] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">openai</SelectItem>
                    <SelectItem value="anthropic">anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Base URL</Label>
                <Input
                  value={provider.base_url}
                  onChange={(e) => updateProvider(provider.uid, { base_url: e.target.value })}
                  placeholder="Để trống dùng địa chỉ chính thức"
                />
              </div>
              <div className="space-y-1.5">
                <Label>API key</Label>
                <SecretInput
                  id={`key-${provider.uid}`}
                  isSet={provider.api_key_set}
                  typed={provider.api_key}
                  onType={(v) => updateProvider(provider.uid, { api_key: v })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Mô hình</div>
              {provider.models.map((model, mIndex) => (
                <div key={mIndex} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_1fr_1.4fr_5.5rem_auto]">
                  <Input aria-label="Khóa" placeholder="Khóa (lưu trong luồng)" value={model.key} onChange={(e) => updateModel(provider.uid, mIndex, { key: e.target.value })} />
                  <Input aria-label="Tên" placeholder="Tên hiển thị" value={model.name} onChange={(e) => updateModel(provider.uid, mIndex, { name: e.target.value })} />
                  <Input aria-label="Mã mô hình" placeholder="Mã gửi cho nhà cung cấp" value={model.model} onChange={(e) => updateModel(provider.uid, mIndex, { model: e.target.value })} />
                  <Input aria-label="Credits" placeholder="Credits" inputMode="numeric" value={model.credits} onChange={(e) => updateModel(provider.uid, mIndex, { credits: e.target.value })} />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Xóa mô hình"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        providers: d.providers.map((p) =>
                          p.uid === provider.uid ? { ...p, models: p.models.filter((_, i) => i !== mIndex) } : p
                        ),
                      }))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateProvider(provider.uid, { models: [...provider.models, emptyModel()] })}
              >
                <Plus /> Thêm mô hình
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={() => setDraft((d) => ({ ...d, providers: [...d.providers, emptyProvider()] }))}>
        <Plus /> Thêm nhà cung cấp
      </Button>

      {problems.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur">
        <span className={cn("mr-auto text-sm text-muted-foreground", !dirty && "invisible")}>Có thay đổi chưa lưu</span>
        <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => setDraft(toDraft(data))}>
          Hoàn tác
        </Button>
        <Button disabled={!dirty || problems.length > 0 || save.isPending} onClick={() => void submit()}>
          {save.isPending && <Spinner />}
          Lưu thay đổi
        </Button>
      </div>
    </div>
  )
}
