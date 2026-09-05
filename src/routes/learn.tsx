import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AddTutorialForm } from "@/components/add-tutorial-form";
import { LeaveSiteDialog } from "@/components/leave-site-dialog";
import { RequireUse } from "@/components/require-use";
import { Button } from "@/components/ui/button";
import {
  FakeVideoBanner,
  StockTutorialTile,
  UserTutorialTile,
} from "@/components/tutorial-tiles";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import {
  deleteOwnTutorialLink,
  listTutorialLinks,
} from "@/lib/tutorial-links";
import {
  resolveTutorialBoard,
  type UserTutorialLink,
} from "@/lib/tutorials";

export const Route = createFileRoute("/learn")({
  loader: async () => {
    try {
      const userTiles = await listTutorialLinks();
      return { userTiles };
    } catch {
      return { userTiles: [] as UserTutorialLink[] };
    }
  },
  component: LearnPage,
});

function LearnPage() {
  const { userTiles: initialTiles } = Route.useLoaderData();
  const user = useCurrentUser();
  const [userTiles, setUserTiles] = useState(initialTiles);
  const [leaving, setLeaving] = useState<UserTutorialLink | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const board = resolveTutorialBoard(userTiles);

  async function refresh() {
    const next = await listTutorialLinks().catch(() => [] as UserTutorialLink[]);
    setUserTiles(next);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
            Tutorials
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl sm:text-5xl">
            Watch it once, then do it in the yard.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Neighbors post a link to a video they already filmed — fencing,
            hay, livestock, or walking a lease. We do not embed it here.
          </p>
        </div>
        <SignedIn>
          <Button
            type="button"
            onClick={() => setShowForm((open) => !open)}
          >
            {showForm ? "Close form" : "Add a tutorial"}
          </Button>
        </SignedIn>
        <SignedOut>
          <Button asChild variant="outline">
            <Link to="/login" search={{ next: "/learn" }}>
              Sign in to post
            </Link>
          </Button>
        </SignedOut>
      </div>

      {showForm ? (
        <div className="mt-8 max-w-xl rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="font-display text-2xl">Link a video you posted</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Title, a short summary, and the public URL. Tapping a tile warns
            before leaving this site.
          </p>
          <div className="mt-6">
            <RequireUse reason="Posting a tutorial takes an account — same as a listing.">
              <AddTutorialForm
                onPosted={async () => {
                  setShowForm(false);
                  await refresh();
                }}
              />
            </RequireUse>
          </div>
        </div>
      ) : null}

      {board.showFakeBanner ? <FakeVideoBanner className="mt-10" /> : null}

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {board.userTiles.map((item) => (
          <UserTutorialTile
            key={item.id}
            item={item}
            canRemove={Boolean(user && user.id === item.userId)}
            removing={removingId === item.id}
            onOpen={setLeaving}
            onRemove={(tile) => {
              setRemovingId(tile.id);
              void deleteOwnTutorialLink({ data: { id: tile.id } })
                .then(() => refresh())
                .finally(() => setRemovingId(null));
            }}
          />
        ))}
        {board.stockTiles.map((item) => (
          <StockTutorialTile key={item.slug} item={item} />
        ))}
      </div>

      {leaving ? (
        <LeaveSiteDialog
          url={leaving.url}
          title={leaving.title}
          onClose={() => setLeaving(null)}
        />
      ) : null}
    </div>
  );
}
