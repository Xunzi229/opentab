import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react"

export type ToastTone = "info" | "success" | "error"

type ToastInput = {
  title?: string
  message: string
  tone?: ToastTone
  durationMs?: number
}

type ToastRecord = ToastInput & {
  id: number
  tone: ToastTone
}

type ToastContextValue = {
  notify: (input: ToastInput) => void
  dismiss: (id: number) => void
}

const DEFAULT_DURATION_MS = 3600
const MAX_TOASTS = 3

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const nextIdRef = useRef(1)
  const timeoutMapRef = useRef(new Map<number, ReturnType<typeof window.setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timeoutId = timeoutMapRef.current.get(id)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeoutMapRef.current.delete(id)
    }

    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    ({ durationMs = DEFAULT_DURATION_MS, tone = "info", ...rest }: ToastInput) => {
      const id = nextIdRef.current
      nextIdRef.current += 1

      setToasts((current) => [...current, { id, tone, durationMs, ...rest }].slice(-MAX_TOASTS))

      const timeoutId = window.setTimeout(() => {
        dismiss(id)
      }, durationMs)

      timeoutMapRef.current.set(id, timeoutId)
    },
    [dismiss]
  )

  useEffect(() => {
    return () => {
      for (const timeoutId of timeoutMapRef.current.values()) {
        window.clearTimeout(timeoutId)
      }
      timeoutMapRef.current.clear()
    }
  }, [])

  const value = useMemo(
    () => ({
      notify,
      dismiss
    }),
    [dismiss, notify]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="sidepanel-toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <section
            key={toast.id}
            className={`sidepanel-toast sidepanel-toast-${toast.tone}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <div className="sidepanel-toast-accent" aria-hidden="true" />
            <div className="sidepanel-toast-copy">
              {toast.title ? <strong>{toast.title}</strong> : null}
              <p>{toast.message}</p>
            </div>
            <button className="sidepanel-toast-close" onClick={() => dismiss(toast.id)} type="button" aria-label="关闭提示">
              ×
            </button>
          </section>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }

  return context
}
