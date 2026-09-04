export const BOARD_GROUNDS = [
  {
    id: "linen",
    label: "Linen",
    swatch: "#d4c4a8",
  },
  {
    id: "pine",
    label: "Pine",
    swatch: "#3f4c3c",
  },
  {
    id: "sage",
    label: "Sage",
    swatch: "#6f8464",
  },
  {
    id: "clay",
    label: "Clay",
    swatch: "#b56a3c",
  },
  {
    id: "barn",
    label: "Barn",
    swatch: "#7a3a32",
  },
  {
    id: "tobacco",
    label: "Tobacco",
    swatch: "#6b4a2e",
  },
  {
    id: "dusk",
    label: "Dusk",
    swatch: "#4a5563",
  },
] as const;

export type BoardGroundId = (typeof BOARD_GROUNDS)[number]["id"];

export function isBoardGround(value: string): value is BoardGroundId {
  return BOARD_GROUNDS.some((item) => item.id === value);
}
