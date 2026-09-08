import { useBoardStore } from "@/lib/board-store";

/** South Carolina neighbors — giveaways still read as Free; Seeking does not. */
export function useScResident() {
  const homeState = useBoardStore((s) => s.homeState);
  return !homeState || homeState === "SC";
}
