export type Tutorial = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  duration: string;
  topic: string;
  videoPath: string;
  posterPath: string;
  farmName: string;
};

export const TUTORIALS: Tutorial[] = [
  {
    slug: "stretching-woven-wire",
    title: "Stretching woven wire",
    summary: "How we hang and stretch a run so it stays tight through a wet spring.",
    body: "Start with posts set and braced at the corners. Unroll the wire on the outside of the line, hang it loose on a few staples, then stretch from the brace. We walk this clip on a Saturday fence job in the Ozarks — same method works on a homestead line. Bring a come-along, gloves, and a second pair of hands.",
    duration: "0:06",
    topic: "Fencing",
    videoPath: "/videos/fence-wire.mp4",
    posterPath: "/images/fencing.jpg",
    farmName: "Red Gate",
  },
  {
    slug: "reading-dry-hay",
    title: "Reading a dry bale",
    summary: "What to look for before you haul first-cut home — color, smell, and the core.",
    body: "Good horse hay is never rained on, stacked off the ground, and smells sweet, not dusty. Walk the barn, crack a bale, and look at the core. This clip is from our hay barn in Willow County after first cutting. If it heats, leave it.",
    duration: "0:06",
    topic: "Feed",
    videoPath: "/videos/hay-barn.mp4",
    posterPath: "/images/hay.jpg",
    farmName: "Cedar Hollow",
  },
  {
    slug: "moving-dairy-goats",
    title: "Moving dairy goats",
    summary: "A quiet pair at the fence — how we handle does that already know the stanchion.",
    body: "Does that travel together settle faster. We let them see the trailer, load the boss first, and keep the ride short. This is Willow and Nettie at our west fence, the same pair listed on the board. No shouting, no dogs.",
    duration: "0:06",
    topic: "Livestock",
    videoPath: "/videos/dairy-goats.mp4",
    posterPath: "/images/goats.jpg",
    farmName: "Cedar Hollow",
  },
  {
    slug: "walking-a-hunting-lease",
    title: "Walking a hunting lease",
    summary: "What to look at before you put money down: edges, water, and how you get in.",
    body: "Walk the property line, find water, and stand on the field edge at first light. Ask about other hunters, ATV rules, and who farms the food plot. This is a creek-bottom timber we lease in the Ozarks — the same kind of ground posted under Hunting leases.",
    duration: "0:06",
    topic: "Leases",
    videoPath: "/videos/hunting-walk.mp4",
    posterPath: "/images/hunting-woods.jpg",
    farmName: "Red Gate",
  },
];

export function getTutorial(slug: string) {
  return TUTORIALS.find((item) => item.slug === slug) ?? null;
}
