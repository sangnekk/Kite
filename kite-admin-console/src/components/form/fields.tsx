import type { ComponentProps, ReactNode } from "react"
import { Controller, get, useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

function FieldShell({
  name,
  label,
  description,
  children,
  className,
}: {
  name: string
  label: string
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  const {
    formState: { errors },
  } = useFormContext()
  const message = get(errors, name)?.message as string | undefined

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {message ? (
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ) : (
        description && <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

type FieldProps = {
  name: string
  label: string
  description?: ReactNode
  className?: string
}

export function TextField({
  name,
  label,
  description,
  className,
  ...input
}: FieldProps & Omit<ComponentProps<typeof Input>, "name">) {
  const { register, formState } = useFormContext()
  return (
    <FieldShell name={name} label={label} description={description} className={className}>
      <Input id={name} aria-invalid={!!get(formState.errors, name)} {...register(name)} {...input} />
    </FieldShell>
  )
}

export function NumberField({
  name,
  label,
  description,
  className,
  ...input
}: FieldProps & Omit<ComponentProps<typeof Input>, "name" | "type">) {
  const { register, formState } = useFormContext()
  return (
    <FieldShell name={name} label={label} description={description} className={className}>
      <Input
        id={name}
        type="number"
        inputMode="decimal"
        aria-invalid={!!get(formState.errors, name)}
        {...register(name, { valueAsNumber: true })}
        {...input}
      />
    </FieldShell>
  )
}

export function SwitchField({
  name,
  label,
  description,
  disabled,
  className,
}: FieldProps & { disabled?: boolean }) {
  const { control } = useFormContext()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={cn("flex items-start justify-between gap-4 rounded-lg border p-3", className)}>
          <div className="space-y-0.5">
            <Label htmlFor={name}>{label}</Label>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <Switch id={name} checked={!!field.value} onCheckedChange={field.onChange} disabled={disabled} />
        </div>
      )}
    />
  )
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}
