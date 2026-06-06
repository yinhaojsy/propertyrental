import './load-env.js';

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: requireEnv('DATABASE_URL', `postgresql://${process.env.USER ?? 'postgres'}@localhost:5432/property_rental`),
  redisUrl: requireEnv('REDIS_URL', 'redis://localhost:6379'),
  jwt: {
    secret: requireEnv('JWT_SECRET', 'dev-secret-change-in-production'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  session: {
    /** End session after this much time without any authenticated API activity */
    inactivityMs: parseInt(process.env.SESSION_INACTIVITY_MS ?? '3600000', 10),
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: requireEnv('S3_BUCKET', 'property-rental'),
    accessKey: requireEnv('S3_ACCESS_KEY', 'minioadmin'),
    secretKey: requireEnv('S3_SECRET_KEY', 'minioadmin'),
    publicUrl: process.env.S3_PUBLIC_URL ?? 'http://localhost:9000/property-rental',
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    notifyEmail: process.env.NOTIFY_EMAIL,
  },
  bootstrap: {
    adminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@test.com',
    adminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'admin123!',
  },
  apiPublicUrl: process.env.API_PUBLIC_URL ?? `http://127.0.0.1:${process.env.PORT ?? '3000'}`,
};

export const isProd = config.nodeEnv === 'production';
