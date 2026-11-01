import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** A search box that waits for the admin to stop typing before it queries. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  className,
  delay = 350,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  delay?: number
}) {
  const [text, setText] = useState(value)

  // Follow the URL (back button, reset) when it changes from outside.
  useEffect(() => setText(value), [value])

  useEffect(() => {
    if (text === value) return
    const timer = setTimeout(() => onChange(text), delay)
    return () => clearTimeout(timer)
  }, [text, value, onChange, delay])

  return (
    <div className={cn("relative min-w-48 flex-1 sm:max-w-sm", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="pr-8 pl-9"
        aria-label={placeholder}
      />
      {text && (
        <button
          type="button"
          aria-label="Xóa tìm kiếm"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setText("")
            onChange("")
          }}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

const ALL = "__all__"

export interface FilterOption {
  value: string
  label: string
}

/** A dropdown filter where the empty value means "everything". */
export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  allLabel: string
  className?: string
}) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger className={cn("w-44", className)} aria-label={allLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
