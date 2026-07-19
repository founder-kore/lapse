import { faker } from "@faker-js/faker";
import { db } from "../src/lib/db";
import { daysFromNow } from "../src/lib/dates";

const ASSET_TYPES = ["MacBook Pro 14", "Dell Latitude 5450", "ThinkPad T14", "iPhone 15"];

function serial() {
  return faker.string.alphanumeric({ length: 8, casing: "upper" });
}

/** One contractor plus any check-ins already sent for them. */
type Spec = {
  endsInDays: number;
  status: string;
  hasAsset: boolean;
  assetReturned?: boolean;
  checkIns: { days: number; response: string | null }[];
  newEndDate?: number;
  // The end date that was in effect *when the check-ins were sent*. Defaults to
  // endsInDays. For EXTENDED contractors this is the original near-term date, so
  // their check-ins are stamped in the past (before the extension pushed the
  // end date out) rather than in the future.
  askedAgainstDays?: number;
};

function buildSpecs(): Spec[] {
  const specs: Spec[] = [];

  // 1. Healthy majority — 22 contractors, nothing due
  for (let i = 0; i < 22; i++) {
    specs.push({
      endsInDays: faker.number.int({ min: 45, max: 300 }),
      status: "ACTIVE",
      hasAsset: true,
      checkIns: [],
    });
  }

  // 2. In the window, awaiting manager response
  specs.push({ endsInDays: 14, status: "ACTIVE", hasAsset: true, checkIns: [{ days: 14, response: null }] });
  specs.push({ endsInDays: 13, status: "ACTIVE", hasAsset: true, checkIns: [{ days: 14, response: null }] });
  specs.push({ endsInDays: 7,  status: "ACTIVE", hasAsset: true, checkIns: [{ days: 14, response: null }, { days: 7, response: null }] });
  specs.push({ endsInDays: 2,  status: "ACTIVE", hasAsset: true, checkIns: [{ days: 14, response: null }, { days: 7, response: null }, { days: 2, response: null }] });

  // 3. Expired, asked three times, never answered — still active. The security finding.
  specs.push({ endsInDays: -9,  status: "EXPIRED_NO_RESPONSE", hasAsset: true, checkIns: [{ days: 14, response: null }, { days: 7, response: null }, { days: 2, response: null }] });
  specs.push({ endsInDays: -34, status: "EXPIRED_NO_RESPONSE", hasAsset: true, checkIns: [{ days: 14, response: null }, { days: 7, response: null }, { days: 2, response: null }] });
  specs.push({ endsInDays: -71, status: "EXPIRED_NO_RESPONSE", hasAsset: true, checkIns: [{ days: 14, response: null }, { days: 7, response: null }, { days: 2, response: null }] });

  // 4. Ended, asset never came back
  specs.push({ endsInDays: -21, status: "ENDED", hasAsset: true, assetReturned: false, checkIns: [{ days: 7, response: "ENDING" }] });
  specs.push({ endsInDays: -58, status: "ENDED", hasAsset: true, assetReturned: false, checkIns: [{ days: 7, response: "ENDING" }] });

  // 5. The lockout — extended verbally, record never updated, date passed
  specs.push({ endsInDays: -3, status: "EXPIRED_NO_RESPONSE", hasAsset: true, checkIns: [{ days: 14, response: null }, { days: 7, response: null }, { days: 2, response: null }] });
  specs.push({ endsInDays: -1, status: "EXPIRED_NO_RESPONSE", hasAsset: true, checkIns: [{ days: 7, response: null }, { days: 2, response: null }] });

  // 6. Extended properly — the loop closing. Asked ~2 weeks before the original
  //    near-term end date (askedAgainstDays), then extended far out.
  specs.push({ endsInDays: 120, status: "EXTENDED", hasAsset: true, newEndDate: 120, askedAgainstDays: 6, checkIns: [{ days: 14, response: "EXTENDING" }] });
  specs.push({ endsInDays: 95,  status: "EXTENDED", hasAsset: true, newEndDate: 95,  askedAgainstDays: 3, checkIns: [{ days: 7,  response: "EXTENDING" }] });

  // 7. Ended cleanly, asset returned — the happy path
  specs.push({ endsInDays: -12, status: "ENDED", hasAsset: true, assetReturned: true, checkIns: [{ days: 14, response: "ENDING" }] });
  specs.push({ endsInDays: -40, status: "ENDED", hasAsset: true, assetReturned: true, checkIns: [{ days: 14, response: "ENDING" }] });

  return specs;
}

async function main() {
  faker.seed(42); // same fake people every run — stable demos

  await db.checkIn.deleteMany();
  await db.contractor.deleteMany();

  const specs = buildSpecs();

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const managerName = faker.person.fullName();

    const contractor = await db.contractor.create({
      data: {
        externalId: `C-${String(10000 + i)}`,
        firstName,
        lastName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        managerName,
        managerEmail: faker.internet.email({ firstName: managerName.split(" ")[0] }).toLowerCase(),
        startDate: daysFromNow(spec.endsInDays - faker.number.int({ min: 90, max: 400 })),
        endDate: daysFromNow(spec.endsInDays),
        status: spec.status,
        assetType: spec.hasAsset ? faker.helpers.arrayElement(ASSET_TYPES) : null,
        assetSerial: spec.hasAsset ? serial() : null,
        assetReturned: spec.assetReturned ?? false,
      },
    });

    // The end date that was in effect when these check-ins went out.
    const refDays = spec.askedAgainstDays ?? spec.endsInDays;

    for (const ci of spec.checkIns) {
      await db.checkIn.create({
        data: {
          contractorId: contractor.id,
          daysBeforeExpiry: ci.days,
          sentAt: daysFromNow(refDays - ci.days),
          respondedAt: ci.response ? daysFromNow(refDays - ci.days + 1) : null,
          response: ci.response,
          newEndDate: ci.response === "EXTENDING" ? daysFromNow(spec.newEndDate ?? 90) : null,
        },
      });
    }
  }

  const total = await db.contractor.count();
  const checkIns = await db.checkIn.count();
  console.log(`Seeded ${total} contractors, ${checkIns} check-ins.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());