// Returns props to spread on a modal backdrop so it only dismisses when both
// mousedown AND mouseup happen on the backdrop itself. Prevents the case
// where a user clicks inside the modal, drags out (e.g. selecting text),
// releases on the backdrop, and the click event bubbles up to close.
//
// Usage: <div {...backdropDismiss(onClose)} style={...}> ... </div>
export function backdropDismiss(onClose) {
  return {
    onMouseDown: (e) => {
      try {
        e.currentTarget.dataset.bdown = e.target === e.currentTarget ? "1" : "0";
      } catch {}
    },
    onClick: (e) => {
      const ok = e.currentTarget?.dataset?.bdown === "1" && e.target === e.currentTarget;
      try { e.currentTarget.dataset.bdown = "0"; } catch {}
      if (ok) onClose?.(e);
    },
  };
}

// React hook variant (kept for consumers that prefer it)
export function useBackdropDismiss(onDismiss) {
  return backdropDismiss(onDismiss);
}
