import { useState, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  destructive?: boolean
  /**
   * For irreversible actions: the admin has to type this text (an app name, an
   * id) before the button is enabled, so a misclick can not do the damage.
   */
  requireText?: string
  /** Runs when confirmed. The dialog closes on success and shows the error otherwise. */
  onConfirm: () => Promise<unknown>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xác nhận",
  destructive = false,
  requireText,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typed, setTyped] = useState("")

  const canConfirm = !pending && (!requireText || typed === requireText)

  function handleOpenChange(next: boolean) {
    if (pending) return
    if (!next) {
      setError(null)
      setTyped("")
    }
    onOpenChange(next)
  }

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await onConfirm()
      setTyped("")
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireText && (
          <div className="space-y-2">
            <Label htmlFor="confirm-text" className="text-sm font-normal">
              Nhập <span className="font-mono font-semibold">{requireText}</span> để xác nhận
            </Label>
            <Input
              id="confirm-text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => handleOpenChange(false)}>
            Hủy
          </Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={!canConfirm} onClick={() => void confirm()}>
            {pending && <Spinner />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
