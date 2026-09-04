import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dates are explicit UTC noon (`T12:00:00Z`) so they render as the correct
// calendar day everywhere, regardless of the viewer's or the build server's
// timezone — a bare `new Date('2026-10-03')` parses as UTC midnight, which
// rolls back a day once rendered in any US timezone (the bug that showed
// "Oct 02" for a race actually on Oct 3). Dates for the newer entries were
// verified via web search in September 2026, not guessed. Elevation
// profiles are approximate — sampled at a handful of mile markers to get
// an accurate silhouette and net-drop/gain math, not a certified GPS trace.
const RACES = [
  {
    name: 'St. George Marathon',
    city: 'St. George',
    region: 'UT',
    date: '2026-10-03',
    distanceMiles: 26.2,
    startElevationFt: 5240,
    finishElevationFt: 2680,
    fieldSize: '7,800',
    tempLowF: 55,
    tempHighF: 78,
    qualifyingStandard: 'Boston qualifier',
    note: 'Net downhill point-to-point through Snow Canyon. The Veyo hill at mile 7.6 is the only real climb; the last 7 miles drop 1,100 ft.',
    profile: [
      [0, 5240], [2, 5150], [4, 5010], [6.5, 5060], [7.6, 5680], [9, 5600],
      [11, 5280], [13, 5060], [15, 4720], [17, 4200], [19, 3760], [21, 3320],
      [23, 3020], [25, 2790], [26.2, 2680],
    ],
  },
  {
    name: 'Chicago Marathon',
    city: 'Chicago',
    region: 'IL',
    date: '2026-10-11',
    distanceMiles: 26.2,
    startElevationFt: 597,
    finishElevationFt: 590,
    fieldSize: '52,000',
    tempLowF: 44,
    tempHighF: 60,
    qualifyingStandard: 'Boston qualifier',
    note: 'Flat and fast, five loops through 29 neighborhoods. Crowd depth makes early pacing the main risk.',
    profile: [
      [0, 597], [2, 590], [4, 600], [6, 592], [8, 586], [10, 596], [12, 604],
      [14, 594], [16, 588], [18, 598], [20, 592], [22, 586], [24, 600],
      [25.8, 612], [26.2, 590],
    ],
  },
  {
    name: 'CIM · California International',
    city: 'Sacramento',
    region: 'CA',
    date: '2026-12-06',
    distanceMiles: 26.2,
    startElevationFt: 305,
    finishElevationFt: 25,
    fieldSize: '9,000',
    tempLowF: 38,
    tempHighF: 58,
    qualifyingStandard: 'Boston qualifier',
    note: 'Gently rolling net downhill from Folsom. Known as a PR course; the rollers end by mile 20.',
    profile: [
      [0, 305], [2, 268], [4, 290], [6, 238], [8, 262], [10, 205], [12, 228],
      [14, 172], [16, 190], [18, 140], [20, 118], [22, 82], [24, 52], [25, 38],
      [26.2, 25],
    ],
  },
  {
    name: 'Boston Marathon',
    city: 'Boston',
    region: 'MA',
    date: '2026-04-20',
    distanceMiles: 26.2,
    startElevationFt: 490,
    finishElevationFt: 30,
    fieldSize: '30,000',
    tempLowF: 46,
    tempHighF: 62,
    qualifyingStandard: 'Qualifying time required',
    note: 'Downhill first 16 miles, then the Newton hills and Heartbreak at mile 20.5. Quad damage decides the finish.',
    profile: [
      [0, 490], [1, 390], [3, 250], [5, 200], [8, 150], [11, 120], [13, 100],
      [15, 60], [16, 50], [17.5, 180], [19, 150], [20.5, 240], [21.5, 190],
      [23, 120], [24.5, 60], [26.2, 30],
    ],
  },
  {
    name: "Grandma's Marathon",
    city: 'Duluth',
    region: 'MN',
    date: '2026-06-20',
    distanceMiles: 26.2,
    startElevationFt: 850,
    finishElevationFt: 600,
    fieldSize: '7,500',
    tempLowF: 50,
    tempHighF: 65,
    qualifyingStandard: 'Boston qualifier',
    note: 'Point-to-point along Lake Superior. Cool lake air, slight net drop, minimal crowd congestion.',
    profile: [
      [0, 850], [2, 820], [4, 838], [6, 790], [8, 806], [10, 760], [12, 742],
      [14, 760], [16, 712], [18, 690], [20, 706], [22, 662], [24, 628],
      [25, 640], [26.2, 600],
    ],
  },
  {
    name: 'TCS New York City Marathon',
    city: 'New York',
    region: 'NY',
    date: '2026-11-01',
    distanceMiles: 26.2,
    startElevationFt: 130,
    finishElevationFt: 40,
    fieldSize: '55,000',
    tempLowF: 45,
    tempHighF: 58,
    qualifyingStandard: 'Guaranteed/lottery entry, Boston qualifier',
    note: 'Five boroughs, five bridges. The Verrazzano climb at the start and the Queensboro Bridge into Manhattan at mile 15-16 are the two real efforts; Central Park has a late false-flat finish.',
    profile: [
      [0, 130], [1, 220], [2, 60], [4, 40], [6, 30], [8, 20], [10, 30],
      [12, 40], [13, 30], [15, 90], [16, 20], [18, 40], [20, 100], [22, 60],
      [24, 90], [25, 130], [26.2, 40],
    ],
  },
  {
    name: 'Marine Corps Marathon',
    city: 'Arlington',
    region: 'VA',
    date: '2026-10-25',
    distanceMiles: 26.2,
    startElevationFt: 190,
    finishElevationFt: 30,
    fieldSize: '30,000',
    tempLowF: 45,
    tempHighF: 65,
    qualifyingStandard: 'Lottery entry, no time standard',
    note: '"The Marine Corps Marathon" — rolling through DC monuments with the Georgetown/Rosslyn hills mid-race and the "Beat the Bridge" cutoff at mile 20 on the 14th Street Bridge.',
    profile: [
      [0, 190], [2, 160], [4, 220], [6, 180], [8, 240], [10, 150], [12, 200],
      [14, 180], [16, 260], [18, 200], [20, 40], [22, 60], [24, 30], [26.2, 30],
    ],
  },
  {
    name: 'Medtronic Twin Cities Marathon',
    city: 'Minneapolis',
    region: 'MN',
    date: '2026-10-04',
    distanceMiles: 26.2,
    startElevationFt: 900,
    finishElevationFt: 830,
    fieldSize: '9,000',
    tempLowF: 40,
    tempHighF: 58,
    qualifyingStandard: 'Boston qualifier',
    note: '"Most Beautiful Urban Marathon" — scenic lakes-and-parkways course with a slight net drop; Summit Avenue in the last miles has the only sustained late-race incline.',
    profile: [
      [0, 900], [3, 870], [6, 890], [9, 860], [12, 840], [15, 900], [18, 870],
      [21, 850], [23, 900], [25, 860], [26.2, 830],
    ],
  },
  {
    name: 'TIAA Philadelphia Marathon',
    city: 'Philadelphia',
    region: 'PA',
    date: '2026-11-22',
    distanceMiles: 26.2,
    startElevationFt: 40,
    finishElevationFt: 20,
    fieldSize: '20,000',
    tempLowF: 35,
    tempHighF: 50,
    qualifyingStandard: 'Boston qualifier',
    note: 'Loops through Center City and Fairmount Park, with an out-and-back into Manayunk around miles 14-20 that has the course\'s only real rolling section.',
    profile: [
      [0, 40], [2, 50], [4, 40], [6, 60], [8, 50], [10, 40], [12, 80],
      [14, 120], [16, 140], [18, 100], [20, 60], [22, 40], [24, 30], [26.2, 20],
    ],
  },
  {
    name: 'Chevron Houston Marathon',
    city: 'Houston',
    region: 'TX',
    date: '2026-01-11',
    distanceMiles: 26.2,
    startElevationFt: 50,
    finishElevationFt: 40,
    fieldSize: '27,000',
    tempLowF: 42,
    tempHighF: 58,
    qualifyingStandard: 'Boston qualifier',
    note: 'One of the flattest major-city courses in the country — minimal elevation change start to finish, run entirely through downtown and surrounding neighborhoods.',
    profile: [
      [0, 50], [4, 45], [8, 55], [12, 40], [16, 50], [20, 45], [24, 42], [26.2, 40],
    ],
  },
  {
    name: 'RBC Brooklyn Half',
    city: 'Brooklyn',
    region: 'NY',
    date: '2026-05-16',
    distanceMiles: 13.1,
    startElevationFt: 130,
    finishElevationFt: 10,
    fieldSize: '27,000',
    tempLowF: 55,
    tempHighF: 68,
    qualifyingStandard: 'Not applicable (non-marathon distance)',
    note: 'Starts in Prospect Park, finishes on the Coney Island boardwalk. Rolling inside the park for the first few miles, flat and fast along Ocean Parkway after.',
    profile: [
      [0, 130], [1, 160], [2, 110], [3, 140], [4, 90], [6, 60], [8, 40],
      [10, 30], [12, 15], [13.1, 10],
    ],
  },
  {
    name: "Rock 'n' Roll San Diego Half Marathon",
    city: 'San Diego',
    region: 'CA',
    date: '2026-05-31',
    distanceMiles: 13.1,
    startElevationFt: 80,
    finishElevationFt: 20,
    fieldSize: '15,000',
    tempLowF: 60,
    tempHighF: 70,
    qualifyingStandard: 'Not applicable (non-marathon distance)',
    note: 'Balboa Park to Mission Bay, mostly flat with a few short rollers through the park in the opening miles. Coastal marine layer usually keeps it cool.',
    profile: [
      [0, 80], [1, 110], [2, 70], [4, 50], [6, 40], [8, 30], [10, 25], [12, 20], [13.1, 20],
    ],
  },
  {
    name: 'Aramco Houston Half Marathon',
    city: 'Houston',
    region: 'TX',
    date: '2026-01-11',
    distanceMiles: 13.1,
    startElevationFt: 50,
    finishElevationFt: 40,
    fieldSize: '15,000',
    tempLowF: 42,
    tempHighF: 58,
    qualifyingStandard: 'Not applicable (non-marathon distance)',
    note: 'Runs the first half of the Houston Marathon course — same flat, fast profile through downtown.',
    profile: [
      [0, 50], [3, 45], [6, 55], [9, 42], [12, 44], [13.1, 40],
    ],
  },
  {
    name: "Rock 'n' Roll Nashville",
    city: 'Nashville',
    region: 'TN',
    date: '2026-04-25',
    distanceMiles: 13.1,
    startElevationFt: 440,
    finishElevationFt: 400,
    fieldSize: '15,000',
    tempLowF: 50,
    tempHighF: 68,
    qualifyingStandard: 'Not applicable (non-marathon distance)',
    note: 'Rolling hills through downtown and Music Row, finishing with a lap into Nissan Stadium.',
    profile: [
      [0, 440], [2, 470], [4, 430], [6, 460], [8, 420], [10, 440], [12, 410], [13.1, 400],
    ],
  },
  {
    name: 'AJC Peachtree Road Race',
    city: 'Atlanta',
    region: 'GA',
    date: '2026-07-04',
    distanceMiles: 6.2,
    startElevationFt: 1050,
    finishElevationFt: 950,
    fieldSize: '55,000',
    tempLowF: 70,
    tempHighF: 85,
    qualifyingStandard: 'Not applicable (non-marathon distance)',
    note: 'The world\'s largest 10K. "Cardiac Hill" climbs through mile 2, then it\'s a long net downhill into Piedmont Park — heat and humidity are the real opponent on a July 4th morning in Atlanta.',
    profile: [
      [0, 1050], [1, 1080], [2, 1150], [2.5, 1160], [4, 1020], [5, 980], [6.2, 950],
    ],
  },
  {
    name: 'BOLDERBoulder',
    city: 'Boulder',
    region: 'CO',
    date: '2026-05-25',
    distanceMiles: 6.2,
    startElevationFt: 5350,
    finishElevationFt: 5320,
    fieldSize: '40,000',
    tempLowF: 50,
    tempHighF: 75,
    qualifyingStandard: 'Not applicable (non-marathon distance)',
    note: 'A Memorial Day tradition finishing inside Folsom Field on the CU campus. Mostly flat with a couple of short rollers — the altitude (~5,300 ft) is the bigger factor for anyone not acclimated.',
    profile: [
      [0, 5350], [1, 5390], [2, 5340], [3, 5300], [4, 5360], [5, 5330], [6.2, 5320],
    ],
  },
  {
    name: 'Utica Boilermaker',
    city: 'Utica',
    region: 'NY',
    date: '2026-07-12',
    distanceMiles: 9.3,
    startElevationFt: 430,
    finishElevationFt: 400,
    fieldSize: '11,000',
    tempLowF: 65,
    tempHighF: 80,
    qualifyingStandard: 'Not applicable (non-marathon distance)',
    note: 'Rolling hills for the full 15K (9.3 mi), with the toughest climb around mile 5 before flattening out toward the finish.',
    profile: [
      [0, 430], [1, 460], [2, 420], [3, 480], [4, 440], [5, 500], [6, 450], [7, 420], [8, 410], [9.3, 400],
    ],
  },
  {
    name: 'Lilac Bloomsday Run',
    city: 'Spokane',
    region: 'WA',
    date: '2026-05-03',
    distanceMiles: 7.46,
    startElevationFt: 1900,
    finishElevationFt: 1970,
    fieldSize: '35,000',
    tempLowF: 45,
    tempHighF: 60,
    qualifyingStandard: 'Not applicable (non-marathon distance)',
    note: 'One of the largest timed road races in the US. "Doomsday Hill," a sustained climb around mile 6-7, is the defining feature after an otherwise rolling course.',
    profile: [
      [0, 1900], [1, 1920], [2, 1880], [3, 1940], [4, 1900], [5, 1870], [6, 1950], [6.7, 2020], [7.46, 1970],
    ],
  },
];

async function main() {
  for (const r of RACES) {
    const date = new Date(`${r.date}T12:00:00Z`);
    let totalGainFt = 0;
    for (let i = 1; i < r.profile.length; i++) {
      const d = r.profile[i][1] - r.profile[i - 1][1];
      if (d > 0) totalGainFt += d;
    }
    const netElevationFt = r.finishElevationFt - r.startElevationFt;

    const data = {
      city: r.city,
      region: r.region,
      date,
      distanceMiles: r.distanceMiles,
      startElevationFt: r.startElevationFt,
      finishElevationFt: r.finishElevationFt,
      netElevationFt,
      totalGainFt: Math.round(totalGainFt),
      fieldSize: r.fieldSize,
      tempLowF: r.tempLowF,
      tempHighF: r.tempHighF,
      qualifyingStandard: r.qualifyingStandard,
      note: r.note,
      profile: r.profile,
    };

    // Matched by name alone (not the name+date unique key) so re-seeding
    // after a date correction updates the existing row instead of creating
    // a duplicate.
    const existing = await prisma.race.findFirst({ where: { name: r.name } });
    if (existing) {
      await prisma.race.update({ where: { id: existing.id }, data });
    } else {
      await prisma.race.create({ data: { name: r.name, ...data } });
    }
  }
  console.log(`Seeded ${RACES.length} races.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
