import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-8 text-primary", className)}
    >
      <rect x="1.5" y="1.5" width="29" height="29" rx="6" fill="currentColor" />
      <path
        d="M6.6 22.2 L11.4 9.2 L16.2 22.2"
        fill="none"
        stroke="#f1ebe1"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 17.4h5.8"
        fill="none"
        stroke="#f1ebe1"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M26.6 13.2c-.9-2-2.8-3.3-5.1-3.3-3.2 0-5.6 2.6-5.6 6.1s2.4 6.1 5.6 6.1c2.2 0 4.1-1.2 5-3.1"
        fill="none"
        stroke="#f1ebe1"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M21.4 16.2h5.4"
        fill="none"
        stroke="#f1ebe1"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className={compact ? "size-7" : "size-8"} />
      <span className="leading-none">
        <span className="sr-only">Ag See a Need Fill a Need</span>
        <span className="block font-display text-sm tracking-tight text-fg" aria-hidden="true">
          See a Need
        </span>
        <span
          className="mt-0.5 block font-display text-sm tracking-tight text-muted"
          aria-hidden="true"
        >
          Fill a Need
        </span>
      </span>
    </span>
  );
}
