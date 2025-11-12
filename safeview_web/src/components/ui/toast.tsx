'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ToastProps {
  title?: string
  description?: string
  type?: 'default' | 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
}

const toastStyles = {
  default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
}

const icons = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  default: null,
}

export function Toast({
  title,
  description,
  type = 'default',
  duration = 5000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true)

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 300)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-md rounded-lg border shadow-lg transition-all duration-300',
        'transform animate-in slide-in-from-top-full',
        toastStyles[type]
      )}
    >
      <div className="flex w-full items-start gap-3 p-4">
        {icons[type] && (
          <div className="flex-shrink-0 pt-0.5">
            {icons[type]}
          </div>
        )}
        <div className="flex-1">
          {title && (
            <div className="text-sm font-semibold">{title}</div>
          )}
          {description && (
            <div className="mt-1 text-sm opacity-90">{description}</div>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onClose?.(), 300)
          }}
          className="flex-shrink-0 rounded-md opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Toast container component
export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed top-0 right-0 z-50 flex flex-col gap-2 p-4">
      {children}
    </div>
  )
}

// Toast hook for easy usage
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const toast = React.useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...props, key: id } as any])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => (t as any).key !== id))
    }, props.duration || 5000)
  }, [])

  return { toast, toasts, setToasts }
}
