import { useBoardStore } from "@/lib/board-store";

/** South Carolina neighbors always see listings as free. */
export function useScResident() {
  const homeState = useBoardStore((s) => s.homeState);
  return !homeState || homeState === "SC";
}
