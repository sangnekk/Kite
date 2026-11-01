import { useState } from "react"
import { RotateCcw, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { api, errorMessage } from "@/lib/api"
import type { SettingsGroup } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SETTINGS_KEY, type FieldSpec, type GroupSpec } from "./groups"
import { buildPatch, initialState, validate, type FormState } from "./payload"

export function RestartNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p>
        Nhóm này chỉ được đọc khi máy chủ khởi động. Sau khi lưu, hãy <strong>khởi động lại máy chủ</strong> để áp dụng.
      </p>
    </div>
  )
}

/** A secret is never shown: it is either stored, replaced or erased. */
export function SecretInput({
  id,
  isSet,
  typed,
  cleared,
  onType,
  onClear,
  onUndoClear,
}: {
  id: string
  isSet: boolean
  typed: string
  cleared?: boolean
  onType: (value: string) => void
  onClear?: () => void
  onUndoClear?: () => void
}) {
  if (cleared) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
        <span>Sẽ bị xóa khi lưu</span>
        <Button variant="ghost" size="sm" onClick={onUndoClear}>
          <RotateCcw /> Hoàn tác
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type="password"
        autoComplete="new-password"
        value={typed}
        onChange={(e) => onType(e.target.value)}
        placeholder={isSet ? "•••••••• đã đặt, để trống để giữ nguyên" : "Chưa đặt"}
      />
      {isSet && onClear && (
        <Button variant="outline" onClick={onClear}>
          Xóa
        </Button>
      )}
    </div>
  )
}

function Field({
  field,
  state,
  data,
  error,
  onChange,
  setState,
}: {
  field: FieldSpec
  state: FormState
  data: SettingsGroup
  error?: string
  onChange: (value: string | boolean) => void
  setState: (updater: (s: FormState) => FormState) => void
}) {
  if (field.kind === "bool") {
    return (
      <div className="flex items-start justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
        <div className="space-y-0.5">
          <Label htmlFor={field.key}>{field.label}</Label>
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </div>
        <Switch id={field.key} checked={state.values[field.key] === true} onCheckedChange={onChange} />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key}>{field.label}</Label>
      {field.kind === "secret" ? (
        <SecretInput
          id={field.key}
          isSet={data.secrets_set[field.key] === true}
          typed={state.secrets[field.key] ?? ""}
          cleared={state.cleared.includes(field.key)}
          onType={(v) => setState((s) => ({ ...s, secrets: { ...s.secrets, [field.key]: v } }))}
          onClear={() => setState((s) => ({ ...s, cleared: [...s.cleared, field.key], secrets: { ...s.secrets, [field.key]: "" } }))}
          onUndoClear={() => setState((s) => ({ ...s, cleared: s.cleared.filter((k) => k !== field.key) }))}
        />
      ) : (
        <Input
          id={field.key}
          value={String(state.values[field.key] ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          inputMode={field.kind === "text" ? undefined : "decimal"}
          aria-invalid={!!error}
        />
      )}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        field.description && <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  )
}

export function GroupForm({ spec, data }: { spec: GroupSpec; data: SettingsGroup }) {
  const [state, setState] = useState<FormState>(() => initialState(spec, data))
  const [serverError, setServerError] = useState<string | null>(null)

  const errors = validate(spec, state)
  const patch = buildPatch(spec, data, state)
  const canSave = patch !== null && Object.keys(errors).length === 0

  const save = useAdminMutation(
    (body: NonNullable<typeof patch>) => api(`/settings/${spec.id}`, { method: "PUT", body: { values: body.values, clear_secrets: body.clear_secrets } }),
    { invalidate: [SETTINGS_KEY], success: "Đã lưu cài đặt", toastError: false }
  )

  async function submit() {
    if (!patch) return
    setServerError(null)
    try {
      await save.mutateAsync(patch)
    } catch (err) {
      setServerError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      {data.restart_required && <RestartNotice />}

      <Card>
        <CardHeader>
          <CardTitle>{spec.label}</CardTitle>
          <CardDescription>{spec.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {spec.fields.map((field) => (
              <Field
                key={field.key}
                field={field}
                state={state}
                data={data}
                error={errors[field.key]}
                setState={setState}
                onChange={(value) => setState((s) => ({ ...s, values: { ...s.values, [field.key]: value } }))}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur">
        <span className={cn("mr-auto text-sm text-muted-foreground", !patch && "invisible")}>Có thay đổi chưa lưu</span>
        <Button variant="outline" disabled={!patch || save.isPending} onClick={() => setState(initialState(spec, data))}>
          Hoàn tác
        </Button>
        <Button disabled={!canSave || save.isPending} onClick={() => void submit()}>
          {save.isPending && <Spinner />}
          Lưu thay đổi
        </Button>
      </div>
    </div>
  )
}
