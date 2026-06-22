const { S3Client } = require('@aws-sdk/client-s3');
const env = require('./env');

let s3 = null;
const { accountId, accessKeyId, secretAccessKey } = env.r2;

if (accountId && accessKeyId && secretAccessKey) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

module.exports = { s3, isConfigured: !!s3 };
