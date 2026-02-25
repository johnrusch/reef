import { Check, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';

/**
 * ToastContainer
 *
 * Fixed-position container for toast notifications in the bottom-right corner.
 * Toasts stack vertically, auto-dismiss when duration > 0, and support
 * optional action buttons (e.g., "Retry").
 *
 * Z-index: z-50 (above GenerationStatusBar z-40)
 * Position: bottom-12 to clear the status bar when it is visible
 */
export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-12 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const borderClass =
          toast.type === 'success'
            ? 'border-green-700/50'
            : toast.type === 'error'
              ? 'border-red-700/50'
              : 'border-blue-700/50';

        const Icon =
          toast.type === 'success' ? Check : toast.type === 'error' ? AlertCircle : Info;

        const iconClass =
          toast.type === 'success'
            ? 'text-green-400'
            : toast.type === 'error'
              ? 'text-red-400'
              : 'text-blue-400';

        return (
          <div
            key={toast.id}
            role="alert"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm bg-gray-800 border ${borderClass} text-gray-100 transition-opacity duration-200 opacity-100`}
          >
            {/* Type icon */}
            <Icon className={`w-4 h-4 ${iconClass} shrink-0`} />

            {/* Message */}
            <span className="flex-1">{toast.message}</span>

            {/* Optional action button */}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap"
              >
                {toast.action.label}
              </button>
            )}

            {/* Dismiss button */}
            <button
              onClick={() => dismiss(toast.id)}
              className="text-gray-500 hover:text-gray-300 shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
