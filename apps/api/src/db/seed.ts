import '../load-env.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { ROLE_PERMISSIONS, ROLES } from '@property-rental/shared';
import { db } from './index.js';
import {
  cities,
  roles,
  rolePermissions,
  sectors,
  users,
  userRoles,
} from './schema.js';
import islamabadSectors from './seeds/islamabad-sectors.json' with { type: 'json' };
import rawalpindiSectors from './seeds/rawalpindi-sectors.json' with { type: 'json' };
import { seedPhotoConfig } from './seed-photo-config.js';
import { seedPropertyTypes } from './seed-property-types.js';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function seedDatabase(): Promise<void> {
  console.log('Seeding database...');

  const cityData = [
    { slug: 'islamabad', nameEn: 'Islamabad', nameZh: '伊斯兰堡' },
    { slug: 'rawalpindi', nameEn: 'Rawalpindi', nameZh: '拉瓦尔品第' },
  ];

  for (const city of cityData) {
    await db
      .insert(cities)
      .values(city)
      .onConflictDoNothing({ target: cities.slug });
  }

  const cityRows = await db.select().from(cities);
  const cityMap = Object.fromEntries(cityRows.map((c) => [c.slug, c.id]));

  const sectorLists: Record<string, string[]> = {
    islamabad: islamabadSectors as string[],
    rawalpindi: rawalpindiSectors as string[],
  };

  for (const [citySlug, names] of Object.entries(sectorLists)) {
    const cityId = cityMap[citySlug];
    if (!cityId) continue;

    for (const nameEn of names) {
      await db
        .insert(sectors)
        .values({
          cityId,
          slug: slugify(nameEn),
          nameEn,
          nameZh: nameEn,
          isActive: true,
        })
        .onConflictDoNothing({ target: [sectors.cityId, sectors.slug] });
    }
    console.log(`Seeded ${names.length} sectors for ${citySlug}`);
  }

  for (const roleName of ROLES) {
    const [role] = await db
      .insert(roles)
      .values({
        name: roleName,
        description: `${roleName} role`,
      })
      .onConflictDoNothing({ target: roles.name })
      .returning();

    const roleId =
      role?.id ??
      (await db.select().from(roles).where(eq(roles.name, roleName)))[0]?.id;

    if (!roleId) continue;

    for (const permission of ROLE_PERMISSIONS[roleName]) {
      await db
        .insert(rolePermissions)
        .values({ roleId, permission })
        .onConflictDoNothing({ target: [rolePermissions.roleId, rolePermissions.permission] });
    }
  }

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@test.com';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'admin123!';

  const existing = await db.select().from(users).where(eq(users.email, adminEmail));
  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const [admin] = await db
      .insert(users)
      .values({
        email: adminEmail,
        passwordHash,
        name: 'Super Admin',
        phone: '+920000000000',
      })
      .returning();

    const superRole = (
      await db.select().from(roles).where(eq(roles.name, 'super_admin'))
    )[0];

    if (admin && superRole) {
      await db.insert(userRoles).values({
        userId: admin.id,
        roleId: superRole.id,
      });
      console.log(`Created bootstrap admin: ${adminEmail}`);
    }
  } else {
    console.log('Bootstrap admin already exists.');
  }

  await seedPropertyTypes();
  await seedPhotoConfig();

  console.log('Seed complete.');
}

const isDirectRun = process.argv[1]?.endsWith('/seed.js') || process.argv[1]?.endsWith('/seed.ts');
if (isDirectRun) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
