/**
 * toast.svelte.ts — Svelte 5 rune-based toast notification and undo manager.
 */

export interface ToastItem {
	id: number;
	message: string;
	actionLabel?: string;
	onAction?: () => void | Promise<void>;
	timeoutId?: ReturnType<typeof setTimeout>;
}

class ToastState {
	toasts = $state<ToastItem[]>([]);
	private nextId = 1;

	show(
		message: string,
		options?: {
			actionLabel?: string;
			onAction?: () => void | Promise<void>;
			duration?: number;
		}
	) {
		const id = this.nextId++;
		const duration = options?.duration ?? 5000;

		const timeoutId = setTimeout(() => {
			this.dismiss(id);
		}, duration);

		const toast: ToastItem = {
			id,
			message,
			actionLabel: options?.actionLabel,
			onAction: options?.onAction,
			timeoutId
		};

		// Keep at most 2 toasts on screen
		if (this.toasts.length >= 2) {
			const oldest = this.toasts[0];
			if (oldest.timeoutId) clearTimeout(oldest.timeoutId);
			this.toasts = this.toasts.slice(1);
		}

		this.toasts = [...this.toasts, toast];
		return id;
	}

	dismiss(id: number) {
		const toast = this.toasts.find((t) => t.id === id);
		if (toast?.timeoutId) {
			clearTimeout(toast.timeoutId);
		}
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}
}

export const toastState = new ToastState();

