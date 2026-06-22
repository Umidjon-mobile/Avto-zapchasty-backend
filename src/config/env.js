require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/autoparts',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  },
  eskiz: {
    email: process.env.ESKIZ_EMAIL || '',
    password: process.env.ESKIZ_PASSWORD || '',
    from: process.env.ESKIZ_FROM || '4546',
    baseUrl: 'https://notify.eskiz.uz/api',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },
  uploadthing: {
    token: process.env.UPLOADTHING_TOKEN || '',
  },
};

env.isProd = env.nodeEnv === 'production';
env.isDev = !env.isProd;

if (env.isProd && (env.jwt.accessSecret.startsWith('dev-') || env.jwt.refreshSecret.startsWith('dev-'))) {
  console.warn("⚠️  PRODUCTION: JWT secret larni o'zgartiring!");
}

module.exports = env;
