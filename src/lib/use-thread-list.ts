import { useEffect, useState } from "react";
import { INVITES_CHANGED } from "@/lib/interest-notify";
import {
  listListingThreads,
  listThreads,
  THREAD_POLL_MS,
  type ThreadSummary,
} from "@/lib/messages";

/** Shared inbox + listing-owner poll so both parties pick up new messages. */
export function useThreadList(listingId?: number) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = listingId
          ? await listListingThreads({ data: { listingId } })
          : await listThreads();
        if (!cancelled) {
          setThreads(data.threads);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, THREAD_POLL_MS);
    const onRefresh = () => {
      void load();
    };
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);
    window.addEventListener(INVITES_CHANGED, onRefresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
      window.removeEventListener(INVITES_CHANGED, onRefresh);
    };
  }, [listingId]);

  return { threads, loaded };
}
