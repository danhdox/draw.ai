import { create } from 'zustand'
import { generateId } from '@/lib/model/diagram'

export type ToastVariant = 'info' | 'success' | 'error'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, variant?: ToastVariant) => string
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, variant = 'info') => {
    const id = generateId('toast')
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }))
    return id
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

// Convenience helper for non-component call sites.
export const toast = {
  info: (message: string) => useToastStore.getState().addToast(message, 'info'),
  success: (message: string) => useToastStore.getState().addToast(message, 'success'),
  error: (message: string) => useToastStore.getState().addToast(message, 'error'),
}
