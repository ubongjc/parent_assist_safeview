import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean // Command on Mac
  altKey?: boolean
  action: () => void
  description: string
  category?: string
}

/**
 * Keyboard shortcuts hook for power users
 *
 * Usage:
 * ```tsx
 * const shortcuts: KeyboardShortcut[] = [
 *   {
 *     key: 'k',
 *     ctrlKey: true,
 *     action: () => setSearchOpen(true),
 *     description: 'Open search',
 *     category: 'Navigation',
 *   },
 * ]
 * useKeyboardShortcuts(shortcuts)
 * ```
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      for (const shortcut of shortcuts) {
        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = shortcut.ctrlKey
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey
        const shiftMatches = shortcut.shiftKey
          ? event.shiftKey
          : !event.shiftKey
        const altMatches = shortcut.altKey ? event.altKey : !event.altKey
        const metaMatches = shortcut.metaKey
          ? event.metaKey
          : !event.metaKey || event.ctrlKey

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          // Don't trigger shortcuts when typing in inputs (unless Ctrl/Cmd is pressed)
          if (isInput && !event.ctrlKey && !event.metaKey) {
            continue
          }

          event.preventDefault()
          shortcut.action()
          break
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Pre-defined common shortcuts for SafeView
 */
export const COMMON_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: '/',
    description: 'Focus search',
    category: 'Navigation',
    action: () => {
      const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]')
      searchInput?.focus()
    },
  },
  {
    key: 'n',
    ctrlKey: true,
    description: 'New session',
    category: 'Actions',
    action: () => {
      const newSessionBtn = document.querySelector<HTMLButtonElement>('[data-new-session]')
      newSessionBtn?.click()
    },
  },
  {
    key: 'd',
    ctrlKey: true,
    description: 'Dashboard',
    category: 'Navigation',
    action: () => {
      window.location.href = '/dashboard'
    },
  },
  {
    key: 'c',
    ctrlKey: true,
    shiftKey: true,
    description: 'Contacts',
    category: 'Navigation',
    action: () => {
      window.location.href = '/contacts'
    },
  },
  {
    key: 's',
    ctrlKey: true,
    description: 'Settings',
    category: 'Navigation',
    action: () => {
      window.location.href = '/settings'
    },
  },
  {
    key: 'Escape',
    description: 'Close modal/dialog',
    category: 'General',
    action: () => {
      const closeBtn = document.querySelector<HTMLButtonElement>('[data-close-dialog]')
      closeBtn?.click()
    },
  },
  {
    key: '?',
    shiftKey: true,
    description: 'Show keyboard shortcuts',
    category: 'Help',
    action: () => {
      const helpModal = document.querySelector<HTMLButtonElement>('[data-shortcuts-modal]')
      helpModal?.click()
    },
  },
]

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const keys: string[] = []

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  if (shortcut.ctrlKey || shortcut.metaKey) {
    keys.push(isMac ? '⌘' : 'Ctrl')
  }
  if (shortcut.shiftKey) {
    keys.push('⇧')
  }
  if (shortcut.altKey) {
    keys.push(isMac ? '⌥' : 'Alt')
  }

  keys.push(shortcut.key.toUpperCase())

  return keys.join(' + ')
}
