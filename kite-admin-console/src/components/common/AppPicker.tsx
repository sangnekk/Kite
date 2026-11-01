import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api } from "@/lib/api"
import type { AppDetail, AppItem, Paged } from "@/lib/types"
import { cn } from "@/lib/utils"

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/**
 * Picks an app by name: it searches the server as the admin types, so it works
 * with any number of apps. The value is the app id.
 */
export function AppPicker({
  value,
  onChange,
  placeholder = "Chọn ứng dụng...",
  clearable = false,
  className,
}: {
  value: string
  onChange: (appId: string) => void
  placeholder?: string
  clearable?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const search = useDebounced(text)

  const results = useQuery({
    queryKey: ["app-picker", search],
    queryFn: ({ signal }) => api<Paged<AppItem>>("/apps", { params: { search, page_size: 10 }, signal }),
    placeholderData: keepPreviousData,
    enabled: open,
  })

  // The id may come from the URL, the name has to be looked up.
  const selected = useQuery({
    queryKey: ["app", value],
    queryFn: ({ signal }) => api<AppDetail>(`/apps/${value}`, { signal }),
    enabled: value !== "",
    staleTime: 60_000,
  })

  return (
    <div className={cn("flex items-center", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-56 justify-between font-normal">
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value ? (selected.data?.name ?? value) : placeholder}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={text} onValueChange={setText} placeholder="Gõ tên ứng dụng..." />
            <CommandList>
              <CommandEmpty>{results.isFetching ? "Đang tìm..." : "Không tìm thấy ứng dụng"}</CommandEmpty>
              <CommandGroup>
                {results.data?.items.map((app) => (
                  <CommandItem
                    key={app.id}
                    value={app.id}
                    onSelect={() => {
                      onChange(app.id)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("size-4", value === app.id ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0">
                      <div className="truncate">{app.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{app.owner_email ?? app.id}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {clearable && value && (
        <Button variant="ghost" size="icon-sm" aria-label="Bỏ chọn ứng dụng" onClick={() => onChange("")}>
          <X />
        </Button>
      )}
    </div>
  )
}
