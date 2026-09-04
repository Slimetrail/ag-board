export const YOUR_LISTINGS_LABEL = "Your listings";
export const YOUR_LISTINGS_PATH = "/listings";

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

/** Hamburger-only: Your listings sits directly under The board. */
export function hamburgerNav() {
  return [
    NAV[0],
    { to: YOUR_LISTINGS_PATH, label: YOUR_LISTINGS_LABEL },
    ...NAV.slice(1),
  ] as const;
}
