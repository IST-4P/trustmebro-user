import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ToastVariant = "success" | "error" | "info"

interface ToastProps {
  message: string
  variant?: ToastVariant
  onClose?: () => void
}

const variantClasses: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-slate-200 bg-white text-slate-900",
}

export function Toast({ message, variant = "info", onClose }: ToastProps) {
  return (
    <div className="fixed right-4 top-4 z-50 w-[min(92vw,360px)]">
      <div
        className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${variantClasses[variant]}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex-1 text-sm font-medium">{message}</div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X size={14} />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
