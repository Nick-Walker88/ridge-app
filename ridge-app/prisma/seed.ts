import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real course facts for five well-known marathons (elevation profiles are
// approximate, sampled at a handful of mile markers — enough to draw an
// accurate silhouette and support net-drop/gain math, not a certified GPS
// trace).
const RACES = [
  {
    name: 'St. George Marathon',
    city: 'St. George',
    region: 'UT',
    date: new Date('2026-10-03'),
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
    date: new Date('2026-10-11'),
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
    date: new Date('2026-12-06'),
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
    date: new Date('2026-04-20'),
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
    date: new Date('2026-06-20'),
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
];

async function main() {
  for (const r of RACES) {
    const netElevationFt = r.finishElevationFt - r.startElevationFt;
    let totalGainFt = 0;
    for (let i = 1; i < r.profile.length; i++) {
      const d = r.profile[i][1] - r.profile[i - 1][1];
      if (d > 0) totalGainFt += d;
    }
    await prisma.race.upsert({
      where: { name_date: { name: r.name, date: r.date } },
      create: {
        name: r.name,
        city: r.city,
        region: r.region,
        date: r.date,
        distanceMiles: 26.2,
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
      },
      update: {},
    });
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
