import { useEffect, useState } from "react";
import { FarmAvatar } from "@/components/farm-avatar";
import { MessageThread } from "@/components/message-thread";
import { useThreadList } from "@/lib/use-thread-list";
import { cn } from "@/lib/utils";

export function OwnerListingThreads({
  listingId,
  currentUserId,
}: {
  listingId: number;
  currentUserId: string;
}) {
  const { threads, loaded } = useThreadList(listingId);
  const [selected, setSelected] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (selected && threads.some((thread) => thread.other.userId === selected)) {
      return;
    }
    if (threads[0]) setSelected(threads[0].other.userId);
  }, [threads, selected]);

  if (!loaded || threads.length === 0) return null;

  const open = threads.find((thread) => thread.other.userId === selected);

  return (
    <div className="mt-5 rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      {threads.length > 1 ? (
        <div className="mb-3 grid gap-2">
          <p className="text-[12px] tracking-wide text-subtle uppercase">
            Connected neighbors
          </p>
          {threads.map((thread) => {
            const active = thread.other.userId === selected;
            return (
              <button
                key={thread.threadId}
                type="button"
                onClick={() => setSelected(thread.other.userId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg p-3 text-left",
                  active ? "bg-wash" : "bg-wash/50 hover:bg-wash",
                )}
              >
                <FarmAvatar
                  name={thread.other.username}
                  src={thread.other.imagePath}
                  className="size-9"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">@{thread.other.username}</p>
                  <p className="truncate text-xs text-muted">
                    {thread.lastBody ?? "No messages yet"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
      {open ? (
        <MessageThread
          otherUserId={open.other.userId}
          listingId={open.listingId ?? listingId}
          currentUserId={currentUserId}
        />
      ) : null}
    </div>
  );
}
