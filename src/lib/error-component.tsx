import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
      <div className="max-w-md">
        <span className="inline-flex text-alert" aria-hidden="true">
          <TriangleAlert className="size-10" strokeWidth={2} />
        </span>
        <h1 className="mt-3 font-display text-3xl">That page didn't load</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {error.message || "Reload, or go back to the board."}
        </p>
      </div>
    </main>
  );
}