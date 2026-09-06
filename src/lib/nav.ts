export const YOUR_LISTINGS_LABEL = "Your listings";
export const YOUR_LISTINGS_PATH = "/listings";
export const IMPROVEMENT_SUGGESTION_LABEL = "Improvement suggestion";

export const NAV = [
  { to: "/market", label: "The board" },
  { to: "/share", label: "Share" },
  { to: "/needs", label: "Needs" },
  { to: "/leases", label: "Leases" },
  { to: "/skills", label: "Skills" },
  { to: "/learn", label: "Learn" },
  { to: "/about", label: "About" },
  { to: "/improve", label: "Improve" },
  { to: "/saved", label: "Pinned" },
] as const;

/** Hamburger-only destinations, in display order. */
export function hamburgerNav() {
  return [
    { to: "/market", label: "The board" },
    { to: YOUR_LISTINGS_PATH, label: YOUR_LISTINGS_LABEL },
    { to: "/saved", label: "Pinned" },
    { to: "/learn", label: "Learn" },
    { to: "/about", label: "About" },
    { to: "/improve", label: IMPROVEMENT_SUGGESTION_LABEL },
  ] as const;
}
