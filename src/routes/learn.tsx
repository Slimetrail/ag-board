import { createFileRoute, Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { TUTORIALS } from "@/lib/tutorials";

export const Route = createFileRoute("/learn")({
  component: LearnPage,
});

function LearnPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Tutorials
      </p>
      <h1 className="mt-2 max-w-2xl font-display text-4xl sm:text-5xl">
        Watch it once, then do it in the yard.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        Short films from farms on the board — fencing, hay, livestock, and
        walking a lease before you sign.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {TUTORIALS.map((item) => (
          <Link
            key={item.slug}
            to="/learn/$slug"
            params={{ slug: item.slug }}
            className="group overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
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
            <div className="p-5">
              <p className="text-[12px] tracking-wide text-subtle uppercase">
                {item.topic} · {item.duration} · {item.farmName}
              </p>
              <h2 className="mt-2 font-display text-2xl">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.summary}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
