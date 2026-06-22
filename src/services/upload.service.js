const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3, isConfigured } = require('../config/storage');
const env = require('../config/env');

const EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
  'image/tiff': 'tiff',
};

// mimetype'dan yoki fayl nomidan kengaytmani aniqlash
function resolveExt(file) {
  if (EXT[file.mimetype]) return EXT[file.mimetype];
  const fromName = path.extname(file.originalname || '').slice(1).toLowerCase();
  if (fromName) return fromName === 'jpeg' ? 'jpg' : fromName;
  // mimetype "image/xxx" bo'lsa subtype'ni olamiz, aks holda jpg
  const sub = /^image\/([a-z0-9.+-]+)$/i.exec(file.mimetype || '');
  return sub ? sub[1].replace('+xml', '') : 'jpg';
}

// UploadThing (lazy init — faqat token bo'lsa)
let utapi = null;
let UTFile = null;
if (env.uploadthing.token) {
  const ut = require('uploadthing/server');
  utapi = new ut.UTApi({ token: env.uploadthing.token });
  UTFile = ut.UTFile;
}

// HEIC/HEIF (iPhone) — brauzerlar ko'rsata olmaydi, JPEG'ga aylantiramiz
async function normalizeImage(file) {
  const isHeic = /heic|heif/i.test(file.mimetype || '') || /\.(heic|heif)$/i.test(file.originalname || '');
  if (!isHeic) return file;
  try {
    const convert = require('heic-convert');
    const jpegBuffer = await convert({ buffer: file.buffer, format: 'JPEG', quality: 0.85 });
    return { buffer: Buffer.from(jpegBuffer), mimetype: 'image/jpeg', originalname: 'photo.jpg' };
  } catch (e) {
    // Aylantirib bo'lmasa, asl faylni qoldiramiz (xato bermaymiz)
    return file;
  }
}

// file: { buffer, mimetype, originalname }
async function uploadImage(rawFile) {
  const file = await normalizeImage(rawFile);
  const ext = resolveExt(file);

  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

  // 1) UploadThing (asosiy) — serverdan to'g'ridan-to'g'ri yuklaydi, public URL qaytaradi
  if (utapi) {
    const utFile = new UTFile([file.buffer], filename, { type: file.mimetype });
    const res = await utapi.uploadFiles(utFile);
    if (res.error) throw new Error(`UploadThing xato: ${res.error.message}`);
    return res.data.ufsUrl || res.data.url;
  }

  // 2) Cloudflare R2
  if (isConfigured) {
    const key = `listings/${filename}`;
    await s3.send(new PutObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    return `${env.r2.publicUrl}/${key}`;
  }

  // 3) Local fallback (DEV) — /uploads ga saqlanadi, /uploads orqali ulashiladi
  const dir = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `/uploads/${filename}`;
}

module.exports = { uploadImage };
