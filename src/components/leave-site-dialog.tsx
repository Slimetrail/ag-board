import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { openExternalTutorial, tutorialHostLabel } from "@/lib/tutorials";

export function LeaveSiteDialog({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const host = tutorialHostLabel(url);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function confirmLeave() {
    openExternalTutorial(url);
    onClose();
  }

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/65 p-3 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-site-title"
        className="w-full max-w-md rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <h2 id="leave-site-title" className="font-display text-2xl text-fg">
          Warning: leaving page
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This tutorial lives on another site ({host}). The board does not
          embed it. OK opens the link in a new tab.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg">{title}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={confirmLeave}>
            OK
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Stay here
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return dialog;
  return createPortal(dialog, document.body);
}
