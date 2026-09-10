import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useBoardStore } from "@/lib/board-store";
import { deleteOwnAccount } from "@/lib/delete-account";

export function DeleteAccountSection() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.isDevFallback) return null;

  return (
    <section className="mt-16 border-t border-border pt-10">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Danger
      </p>
      <h2 className="mt-2 font-display text-2xl">Delete account</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        This takes down your sign-in and your place on the board. You will not
        be able to come back in with this email. Listings, drafts, and private
        messages go with it.
      </p>
      <Button
        type="button"
        variant="destructive"
        className="mt-5"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Delete account
      </Button>
      {error ? (
        <p className="mt-3 text-sm text-fg" role="alert">
          {error}
        </p>
      ) : null}
      {open ? (
        <DeleteAccountConfirm
          pending={pending}
          onClose={() => {
            if (!pending) setOpen(false);
          }}
          onConfirm={() => {
            setPending(true);
            setError(null);
            void deleteOwnAccount({ data: { confirm: true } })
              .then(() => {
                useBoardStore.getState().clearAccountLocalState();
                return signOut("/").catch(() => {
                  window.location.href = "/";
                });
              })
              .catch((err: unknown) => {
                setPending(false);
                const message =
                  err instanceof Error
                    ? err.message
                    : "Could not delete the account.";
                setError(message);
                toast(message);
              });
          }}
        />
      ) : null}
    </section>
  );
}

function DeleteAccountConfirm({
  pending,
  onClose,
  onConfirm,
}: {
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/65 p-3 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="w-full max-w-md rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <h2 id="delete-account-title" className="font-display text-2xl text-fg">
          Delete this account?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This cannot be undone. Your sign-in is removed, so this email cannot
          be used to sign in again. Your public profile, listings, drafts, and
          private messages are deleted with it.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Deleting…" : "Delete account"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            Keep my account
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return dialog;
  return createPortal(dialog, document.body);
}
