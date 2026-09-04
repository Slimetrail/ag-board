import { SC_COUNTY_GROUPS } from "@/lib/counties";

export type StateCode = "SC" | "NC" | "GA" | "TN" | "AL" | "FL" | "VA";

export type CountyGroup = { name: string; counties: readonly string[] };

export const STATE_META: Record<
  StateCode,
  { name: string; groups: readonly CountyGroup[] }
> = {
  SC: { name: "South Carolina", groups: SC_COUNTY_GROUPS },
  NC: {
    name: "North Carolina",
    groups: [
      {
        name: "Counties",
        counties: [
          "Alamance","Alexander","Alleghany","Anson","Ashe","Avery","Beaufort","Bertie","Bladen","Brunswick","Buncombe","Burke","Cabarrus","Caldwell","Camden","Carteret","Caswell","Catawba","Chatham","Cherokee","Chowan","Clay","Cleveland","Columbus","Craven","Cumberland","Currituck","Dare","Davidson","Davie","Duplin","Durham","Edgecombe","Forsyth","Franklin","Gaston","Gates","Graham","Granville","Greene","Guilford","Halifax","Harnett","Haywood","Henderson","Hertford","Hoke","Hyde","Iredell","Jackson","Johnston","Jones","Lee","Lenoir","Lincoln","Macon","Madison","Martin","McDowell","Mecklenburg","Mitchell","Montgomery","Moore","Nash","New Hanover","Northampton","Onslow","Orange","Pamlico","Pasquotank","Pender","Perquimans","Person","Pitt","Polk","Randolph","Richmond","Robeson","Rockingham","Rowan","Rutherford","Sampson","Scotland","Stanly","Stokes","Surry","Swain","Transylvania","Tyrrell","Union","Vance","Wake","Warren","Washington","Watauga","Wayne","Wilkes","Wilson","Yadkin","Yancey",
        ],
      },
    ],
  },
  GA: {
    name: "Georgia",
    groups: [
      {
        name: "Counties",
        counties: [
          "Appling","Atkinson","Bacon","Baker","Baldwin","Banks","Barrow","Bartow","Ben Hill","Berrien","Bibb","Bleckley","Brantley","Brooks","Bryan","Bulloch","Burke","Butts","Calhoun","Camden","Candler","Carroll","Catoosa","Charlton","Chatham","Chattahoochee","Chattooga","Cherokee","Clarke","Clay","Clayton","Clinch","Cobb","Coffee","Colquitt","Columbia","Cook","Coweta","Crawford","Crisp","Dade","Dawson","Decatur","DeKalb","Dodge","Dooly","Dougherty","Douglas","Early","Echols","Effingham","Elbert","Emanuel","Evans","Fannin","Fayette","Floyd","Forsyth","Franklin","Fulton","Gilmer","Glascock","Glynn","Gordon","Grady","Greene","Gwinnett","Habersham","Hall","Hancock","Haralson","Harris","Hart","Heard","Henry","Houston","Irwin","Jackson","Jasper","Jeff Davis","Jefferson","Jenkins","Johnson","Jones","Lamar","Lanier","Laurens","Lee","Liberty","Lincoln","Long","Lowndes","Lumpkin","Macon","Madison","Marion","McDuffie","McIntosh","Meriwether","Miller","Mitchell","Monroe","Montgomery","Morgan","Murray","Muscogee","Newton","Oconee","Oglethorpe","Paulding","Peach","Pickens","Pierce","Pike","Polk","Pulaski","Putnam","Quitman","Rabun","Randolph","Richmond","Rockdale","Schley","Screven","Seminole","Spalding","Stephens","Stewart","Sumter","Talbot","Taliaferro","Tattnall","Taylor","Telfair","Terrell","Thomas","Tift","Toombs","Towns","Treutlen","Troup","Turner","Twiggs","Union","Upson","Walker","Walton","Ware","Warren","Washington","Wayne","Webster","Wheeler","White","Whitfield","Wilcox","Wilkes","Wilkinson","Worth",
        ],
      },
    ],
  },
  TN: {
    name: "Tennessee",
    groups: [
      {
        name: "Counties",
        counties: [
          "Anderson","Bedford","Benton","Bledsoe","Blount","Bradley","Campbell","Cannon","Carroll","Carter","Cheatham","Chester","Claiborne","Clay","Cocke","Coffee","Crockett","Cumberland","Davidson","Decatur","DeKalb","Dickson","Dyer","Fayette","Fentress","Franklin","Gibson","Giles","Grainger","Greene","Grundy","Hamblen","Hamilton","Hancock","Hardeman","Hardin","Hawkins","Haywood","Henderson","Henry","Hickman","Houston","Humphreys","Jackson","Jefferson","Johnson","Knox","Lake","Lauderdale","Lawrence","Lewis","Lincoln","Loudon","Macon","Madison","Marion","Marshall","Maury","McMinn","McNairy","Meigs","Monroe","Montgomery","Moore","Morgan","Obion","Overton","Perry","Pickett","Polk","Putnam","Rhea","Roane","Robertson","Rutherford","Scott","Sequatchie","Sevier","Shelby","Smith","Stewart","Sullivan","Sumner","Tipton","Trousdale","Unicoi","Union","Van Buren","Warren","Washington","Wayne","Weakley","White","Williamson","Wilson",
        ],
      },
    ],
  },
  AL: {
    name: "Alabama",
    groups: [
      {
        name: "Counties",
        counties: [
          "Autauga","Baldwin","Barbour","Bibb","Blount","Bullock","Butler","Calhoun","Chambers","Cherokee","Chilton","Choctaw","Clarke","Clay","Cleburne","Coffee","Colbert","Conecuh","Coosa","Covington","Crenshaw","Cullman","Dale","Dallas","DeKalb","Elmore","Escambia","Etowah","Fayette","Franklin","Geneva","Greene","Hale","Henry","Houston","Jackson","Jefferson","Lamar","Lauderdale","Lawrence","Lee","Limestone","Lowndes","Macon","Madison","Marengo","Marion","Marshall","Mobile","Monroe","Montgomery","Morgan","Perry","Pickens","Pike","Randolph","Russell","Shelby","St. Clair","Sumter","Talladega","Tallapoosa","Tuscaloosa","Walker","Washington","Wilcox","Winston",
        ],
      },
    ],
  },
  FL: {
    name: "Florida",
    groups: [
      {
        name: "Counties",
        counties: [
          "Alachua","Baker","Bay","Bradford","Brevard","Broward","Calhoun","Charlotte","Citrus","Clay","Collier","Columbia","DeSoto","Dixie","Duval","Escambia","Flagler","Franklin","Gadsden","Gilchrist","Glades","Gulf","Hamilton","Hardee","Hendry","Hernando","Highlands","Hillsborough","Holmes","Indian River","Jackson","Jefferson","Lafayette","Lake","Lee","Leon","Levy","Liberty","Madison","Manatee","Marion","Martin","Miami-Dade","Monroe","Nassau","Okaloosa","Okeechobee","Orange","Osceola","Palm Beach","Pasco","Pinellas","Polk","Putnam","Santa Rosa","Sarasota","Seminole","St. Johns","St. Lucie","Sumter","Suwannee","Taylor","Union","Volusia","Wakulla","Walton","Washington",
        ],
      },
    ],
  },
  VA: {
    name: "Virginia",
    groups: [
      {
        name: "Counties",
        counties: [
          "Accomack","Albemarle","Alleghany","Amelia","Amherst","Appomattox","Arlington","Augusta","Bath","Bedford","Bland","Botetourt","Brunswick","Buchanan","Buckingham","Campbell","Caroline","Carroll","Charles City","Charlotte","Chesterfield","Clarke","Craig","Culpeper","Cumberland","Dickenson","Dinwiddie","Essex","Fairfax","Fauquier","Floyd","Fluvanna","Franklin","Frederick","Giles","Gloucester","Goochland","Grayson","Greene","Greensville","Halifax","Hanover","Henrico","Henry","Highland","Isle of Wight","James City","King and Queen","King George","King William","Lancaster","Lee","Loudoun","Louisa","Lunenburg","Madison","Mathews","Mecklenburg","Middlesex","Montgomery","Nelson","New Kent","Northampton","Northumberland","Nottoway","Orange","Page","Patrick","Pittsylvania","Powhatan","Prince Edward","Prince George","Prince William","Pulaski","Rappahannock","Richmond","Roanoke","Rockbridge","Rockingham","Russell","Scott","Shenandoah","Smyth","Southampton","Spotsylvania","Stafford","Surry","Sussex","Tazewell","Warren","Washington","Westmoreland","Wise","Wythe","York",
        ],
      },
    ],
  },
};

export const ALL_STATE_CODES = Object.keys(STATE_META) as StateCode[];

export function isStateCode(value: string): value is StateCode {
  return value in STATE_META;
}

export function countiesFor(state: StateCode) {
  return STATE_META[state].groups.flatMap((group) => [...group.counties]);
}

export function isCountyInState(county: string, state: string) {
  if (!isStateCode(state)) return false;
  return countiesFor(state).includes(county);
}

export function placeLabel(county: string, state: string) {
  return `${county} County, ${state}`;
}

export function parseRegion(region: string): { county: string; state: StateCode } | null {
  const match = /^(.*?)\s+County(?:,\s*([A-Z]{2}))?$/i.exec(region.trim());
  if (!match) return null;
  const county = match[1].trim();
  const state = (match[2] ?? "SC").toUpperCase();
  if (!isStateCode(state)) return null;
  return { county, state };
}

export function formatRegion(region: string) {
  if (/,\s*[A-Z]{2}$/.test(region.trim())) return region;
  return `${region}, SC`;
}
