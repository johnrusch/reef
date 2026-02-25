import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  action?: ToastAction;
  /** Auto-dismiss timeout in ms (0 = no auto-dismiss) */
  duration: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const MAX_TOASTS = 5;

export const useToastStore = create<ToastStore>()(
  devtools(
    (set, get) => ({
      toasts: [],

      addToast: (toast: Omit<Toast, 'id'>) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        const newToast: Toast = { ...toast, id };

        set((prev) => {
          const existing = prev.toasts;
          // Cap at MAX_TOASTS — remove oldest if over limit
          const trimmed =
            existing.length >= MAX_TOASTS ? existing.slice(existing.length - MAX_TOASTS + 1) : existing;
          return { toasts: [...trimmed, newToast] };
        });

        if (toast.duration > 0) {
          setTimeout(() => {
            get().dismiss(id);
          }, toast.duration);
        }

        return id;
      },

      dismiss: (id: string) => {
        set((prev) => ({
          toasts: prev.toasts.filter((t) => t.id !== id),
        }));
      },

      dismissAll: () => {
        set({ toasts: [] });
      },
    }),
    { name: 'toast-store' }
  )
);
