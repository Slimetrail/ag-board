import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FAKE_VIDEO_BANNER,
  tutorialHostLabel,
  type Tutorial,
  type UserTutorialLink,
} from "@/lib/tutorials";
import { cn } from "@/lib/utils";

export function FakeVideoBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-surface px-5 py-4 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        {FAKE_VIDEO_BANNER}
      </p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Placeholder clips until a neighbor posts a real tutorial link. Stock
        files stay on the board as a fallback and come back if those tiles
        come down.
      </p>
    </div>
  );
}

export function StockTutorialTile({
  item,
  tone = "page",
}: {
  item: Tutorial;
  tone?: "page" | "hero";
}) {
  const hero = tone === "hero";
  return (
    <Link
      to="/learn/$slug"
      params={{ slug: item.slug }}
      className={cn(
        "group overflow-hidden rounded-xl shadow-[var(--shadow-card)]",
        hero
          ? "bg-fg/20"
          : "bg-surface transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]",
      )}
    >
      <div className="relative">
        <img
          src={item.posterPath}
          alt=""
          className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute right-3 bottom-3 flex size-11 items-center justify-center rounded-full bg-surface text-fg">
          <Play className="ml-0.5 size-4 fill-current" />
        </span>
      </div>
      <div className={hero ? "p-4" : "p-5"}>
        <p
          className={cn(
            "tracking-wide uppercase",
            hero
              ? "text-[11px] text-primary-fg/60"
              : "text-[12px] text-subtle",
          )}
        >
          {item.topic} · {item.duration} · {item.farmName}
        </p>
        <h2
          className={cn(
            "mt-2 font-display",
            hero ? "text-xl" : "text-2xl",
          )}
        >
          {item.title}
        </h2>
        {hero ? null : (
          <p className="mt-2 text-sm leading-relaxed text-muted">{item.summary}</p>
        )}
      </div>
    </Link>
  );
}

export function UserTutorialTile({
  item,
  tone = "page",
  canRemove = false,
  removing = false,
  onOpen,
  onRemove,
}: {
  item: UserTutorialLink;
  tone?: "page" | "hero";
  canRemove?: boolean;
  removing?: boolean;
  onOpen: (item: UserTutorialLink) => void;
  onRemove?: (item: UserTutorialLink) => void;
}) {
  const hero = tone === "hero";
  const host = tutorialHostLabel(item.url);
  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl shadow-[var(--shadow-card)]",
        hero ? "bg-fg/20" : "bg-surface",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="group block w-full text-left"
      >
        <div
          className={cn(
            "relative flex aspect-video w-full items-center justify-center",
            hero ? "bg-fg/40" : "bg-wash",
          )}
        >
          <span className="absolute left-3 top-3 rounded-full bg-surface px-2.5 py-1 text-[11px] tracking-wide text-muted uppercase">
            {host}
          </span>
          <span className="flex size-11 items-center justify-center rounded-full bg-surface text-fg">
            <Play className="ml-0.5 size-4 fill-current" />
          </span>
        </div>
        <div className={hero ? "p-4" : "p-5"}>
          <p
            className={cn(
              "tracking-wide uppercase",
              hero
                ? "text-[11px] text-primary-fg/60"
                : "text-[12px] text-subtle",
            )}
          >
            {host} · {item.farmName}
          </p>
          <h2
            className={cn(
              "mt-2 font-display",
              hero ? "text-xl" : "text-2xl",
            )}
          >
            {item.title}
          </h2>
          {hero ? null : (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {item.summary}
            </p>
          )}
        </div>
      </button>
      {canRemove && onRemove ? (
        <div className={hero ? "px-4 pb-4" : "px-5 pb-5"}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={removing}
            onClick={() => onRemove(item)}
          >
            {removing ? "Taking down…" : "Take down"}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
