import '../load-env.js';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

async function smokeTest() {
  const health = await fetch(`${API_URL}/api/health`);
  if (!health.ok) throw new Error('Health check failed');
  console.log('✓ Health check passed');

  const csrfRes = await fetch(`${API_URL}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const cookies = csrfRes.headers.get('set-cookie') ?? '';
  console.log('✓ CSRF token obtained');

  const search = await fetch(`${API_URL}/api/listings/search?listingType=residential&propertySubtype=house`);
  if (!search.ok) throw new Error('Search failed');
  const searchData = await search.json();
  console.log(`✓ Search returned ${searchData.data?.length ?? 0} listings`);

  const cities = await fetch(`${API_URL}/api/locations/cities`);
  if (!cities.ok) throw new Error('Cities failed');
  console.log('✓ Cities endpoint passed');

  console.log('All smoke tests passed.');
}

smokeTest().catch((err) => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});
