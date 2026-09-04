import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BoardGroundId } from "@/lib/board-ground";

type BoardState = {
  savedIds: number[];
  postedIds: number[];
  farmName: string;
  homeCounty: string;
  homeState: string;
  boardView: "tile" | "list";
  boardGround: BoardGroundId;
  toggleSaved: (id: number) => void;
  isSaved: (id: number) => boolean;
  markPosted: (id: number) => void;
  setFarmName: (name: string) => void;
  setHomeCounty: (county: string, state?: string) => void;
  setBoardView: (view: "tile" | "list") => void;
  setBoardGround: (ground: BoardGroundId) => void;
};

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      savedIds: [],
      postedIds: [],
      farmName: "",
      homeCounty: "",
      homeState: "SC",
      boardView: "tile",
      boardGround: "linen",
      toggleSaved: (id) =>
        set((state) => ({
          savedIds: state.savedIds.includes(id)
            ? state.savedIds.filter((item) => item !== id)
            : [...state.savedIds, id],
        })),
      isSaved: (id) => get().savedIds.includes(id),
      markPosted: (id) =>
        set((state) => ({
          postedIds: state.postedIds.includes(id)
            ? state.postedIds
            : [...state.postedIds, id],
        })),
      setFarmName: (farmName) => set({ farmName }),
      setHomeCounty: (homeCounty, homeState = "SC") =>
        set({ homeCounty, homeState }),
      setBoardView: (boardView) => set({ boardView }),
      setBoardGround: (boardGround) => set({ boardGround }),
    }),
    { name: "acre-board" },
  ),
);
