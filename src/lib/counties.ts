export const SC_COUNTY_GROUPS = [
  {
    name: "Upstate",
    counties: [
      "Abbeville",
      "Anderson",
      "Cherokee",
      "Greenville",
      "Greenwood",
      "Laurens",
      "Oconee",
      "Pickens",
      "Spartanburg",
      "Union",
    ],
  },
  {
    name: "Midlands",
    counties: [
      "Aiken",
      "Calhoun",
      "Chester",
      "Edgefield",
      "Fairfield",
      "Kershaw",
      "Lancaster",
      "Lexington",
      "McCormick",
      "Newberry",
      "Orangeburg",
      "Richland",
      "Saluda",
      "Sumter",
      "York",
    ],
  },
  {
    name: "Pee Dee",
    counties: [
      "Chesterfield",
      "Clarendon",
      "Darlington",
      "Dillon",
      "Florence",
      "Georgetown",
      "Horry",
      "Lee",
      "Marion",
      "Marlboro",
      "Williamsburg",
    ],
  },
  {
    name: "Lowcountry",
    counties: [
      "Allendale",
      "Bamberg",
      "Barnwell",
      "Beaufort",
      "Berkeley",
      "Charleston",
      "Colleton",
      "Dorchester",
      "Hampton",
      "Jasper",
    ],
  },
] as const;

export const SC_COUNTIES = SC_COUNTY_GROUPS.flatMap(
  (group) => group.counties,
) as unknown as [
  (typeof SC_COUNTY_GROUPS)[number]["counties"][number],
  ...(typeof SC_COUNTY_GROUPS)[number]["counties"][number][],
];

export type ScCounty = (typeof SC_COUNTIES)[number];

export const FARM_COUNTY: Record<string, ScCounty> = {
  "Cedar Hollow": "Newberry",
  "Evening Shade": "Aiken",
  Swallowtail: "Pickens",
  "Red Gate": "Edgefield",
  Millcreek: "York",
  "Two Pines": "Anderson",
  "Fox Run": "Colleton",
  "North Forty": "Florence",
  "Quarry Road": "Oconee",
  "Little Thistle": "Orangeburg",
};

export function isScCounty(value: string): value is ScCounty {
  return (SC_COUNTIES as readonly string[]).includes(value);
}

export function countyLabel(county: ScCounty) {
  return `${county} County, SC`;
}

export function countyFromRegion(region: string): ScCounty | null {
  const name = region.replace(/\s+County(?:,\s*[A-Z]{2})?$/i, "").trim();
  return isScCounty(name) ? name : null;
}
