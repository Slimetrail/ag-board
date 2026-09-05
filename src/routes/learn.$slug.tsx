import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { LeaveSiteDialog } from "@/components/leave-site-dialog";
import { UserTutorialTile } from "@/components/tutorial-tiles";
import { listTutorialLinks } from "@/lib/tutorial-links";
import {
  getTutorial,
  resolveTutorialBoard,
  TUTORIALS,
  type UserTutorialLink,
} from "@/lib/tutorials";

export const Route = createFileRoute("/learn/$slug")({
  loader: async ({ params }) => {
    const tutorial = getTutorial(params.slug);
    if (!tutorial) throw notFound();
    let userTiles: UserTutorialLink[] = [];
    try {
      userTiles = await listTutorialLinks();
    } catch {
      userTiles = [];
    }
    return { tutorial, userTiles };
  },
  component: TutorialPage,
});

function TutorialPage() {
  const { tutorial, userTiles } = Route.useLoaderData();
  const board = resolveTutorialBoard(userTiles);
  const [leaving, setLeaving] = useState<UserTutorialLink | null>(null);
  const stockOthers = board.showStock
    ? TUTORIALS.filter((item) => item.slug !== tutorial.slug)
    : [];

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/learn"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        All tutorials
      </Link>
      <p className="mt-8 text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        {tutorial.topic} · {tutorial.duration} · {tutorial.farmName}
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{tutorial.title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
        {tutorial.summary}
      </p>
      <div className="mt-8 overflow-hidden rounded-xl bg-fg shadow-[var(--shadow-card)]">
        <video
          className="aspect-video w-full"
          controls
          playsInline
          poster={tutorial.posterPath}
          preload="metadata"
        >
          <source src={tutorial.videoPath} type="video/mp4" />
        </video>
      </div>
      <p className="mt-8 max-w-2xl text-base leading-relaxed text-fg/90">
        {tutorial.body}
      </p>
      {board.userTiles.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-display text-2xl">From neighbors</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {board.userTiles.slice(0, 4).map((item) => (
              <UserTutorialTile
                key={item.id}
                item={item}
                onOpen={setLeaving}
              />
            ))}
          </div>
        </section>
      ) : stockOthers.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-display text-2xl">More from the yard</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {stockOthers.map((item) => (
              <Link
                key={item.slug}
                to="/learn/$slug"
                params={{ slug: item.slug }}
                className="group overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]"
              >
                <img
                  src={item.posterPath}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
                <div className="p-3">
                  <p className="text-[11px] tracking-wide text-subtle uppercase">
                    {item.topic}
                  </p>
                  <h3 className="mt-1 font-display text-lg leading-snug">
                    {item.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {leaving ? (
        <LeaveSiteDialog
          url={leaving.url}
          title={leaving.title}
          onClose={() => setLeaving(null)}
        />
      ) : null}
    </article>
  );
}
