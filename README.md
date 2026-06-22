# AvtoEhtiyot — Backend (Express + MongoDB)

Avtoehtiyot qismlar marketplace (C2C classifieds) uchun to'liq REST API.
Telefon+OTP autentifikatsiya, sinonim/OEM qidiruv, e'lonlar, moderatsiya va admin.

## Texnologiyalar
Node.js · Express · MongoDB (Mongoose) · JWT · Zod · Multer · Cloudflare R2/S3 · Eskiz.uz

## O'rnatish

```bash
npm install
cp .env.example .env      # MONGODB_URI va boshqalarni sozlang
npm run seed              # katalog (738 detal) + brendlar + shaharlar
npm run dev               # http://localhost:4000
```

Tekshiruv (DB shart emas):
```bash
npm run verify
```

### DEV rejim (sozlamasiz ishlaydi)
- **SMS:** Eskiz sozlanmagan bo'lsa, OTP kodi **konsolga** chiqadi va `send-otp` javobida `devCode` sifatida qaytadi.
- **Rasm:** R2 sozlanmagan bo'lsa, rasmlar `/uploads` ga saqlanadi va `/uploads/...` orqali ochiladi.

## API endpointlar

### Auth — `/api/auth`
| Method | Yo'l | Izoh |
|---|---|---|
| POST | `/send-otp` | OTP yuborish (1 daq / 3 marta limit) |
| POST | `/verify-otp` | Tasdiqlash → access + refresh token |
| POST | `/refresh` | Token yangilash (rotatsiya) |
| POST | `/logout` | Refresh tokenni bekor qilish |
| GET | `/me` | Joriy foydalanuvchi |
| PATCH | `/me` | Profilni yangilash |

### Katalog — `/api/catalog` (ochiq)
`/brands` · `/brands/:id/models` · `/models/:id/generations` · `/generations/:id/engines` · `/categories` · `/categories/:id/part-types` · `/cities`

### Qidiruv — `/api/search` (ochiq)
| GET | `/` | Asosiy qidiruv (sinonim + OEM + filtr) |
| GET | `/suggest?q=` | Autocomplete |
| GET | `/oem/:number` | OEM bo'yicha aniq qidiruv |

Filtrlar: `q, categoryId, brandId, modelId, condition, city, minPrice, maxPrice, sort(relevance|newest|cheap|expensive), page, limit`

### E'lonlar — `/api/listings`
| GET | `/` | Qidiruv/ro'yxat |
| GET | `/my` | O'z e'lonlarim (auth) |
| GET | `/favorites/list` | Sevimlilar (auth) |
| POST | `/` | Yaratish (auth; buyer→seller avto) |
| GET | `/:id` | Tafsilot (+isFavorite) |
| PATCH | `/:id` | Tahrirlash (egasi/admin) |
| DELETE | `/:id` | O'chirish (egasi/admin) |
| PATCH | `/:id/status` | sold/archived/active |
| POST | `/:id/favorite` | Sevimliga qo'shish/olib tashlash |

### Yuklash — `/api/upload`
| POST | `/images` | multipart, maydon `images` (5MB, 10 ta) — auth |

### Foydalanuvchi — `/api/users`
| GET | `/:id/profile` | Ochiq sotuvchi profili |

### Admin — `/api/admin` (auth + admin/superadmin)
Moderatsiya: `GET /listings`, `PATCH /listings/:id/moderate` (approve/reject).
Foydalanuvchilar: `GET /users`, `PATCH /users/:id` (role/verified/blocked).
Analitika: `GET /analytics`.
Katalog CRUD: `/brands` `/models` `/generations` `/engines` `/categories` `/part-types` `/synonyms` `/cities` (POST/PATCH/DELETE).

## Loyiha tuzilishi
```
src/
├── config/        env, db, storage(R2)
├── models/        User, Otp, Brand, CarModel, Generation, Engine,
│                  City, PartCategory, PartType, Synonym, Listing
├── middleware/    auth, role, validate, error, rateLimit
├── validators/    zod schemalar
├── services/      sms (Eskiz), upload (R2), search (yurak), listing
├── controllers/   auth, catalog, listing, search, upload, user, admin
├── routes/        har modul + index
├── seeds/         seedCatalog.js, seedVehicles.js, data/*.json
├── app.js         Express app (DB'siz)
└── server.js      DB ulanish + listen
```

## Qidiruv tizimi
So'rov 3 yo'l bilan ishlanadi:
1. **OEM** — so'rov OEM ga o'xshasa (6+ belgi + raqam), `oemNormalized` (separatorsiz, katta harf) ustidan prefiks qidiruv.
2. **Sinonim + full-text** — har token `synonyms` lug'atidan ikki tomonlama kengaytiriladi ("колодка"→"тормозные колодки"), keyin `searchText` text-indeks ustidan.
3. **Filtrlar** — kategoriya, brend, model, holat, shahar, narx.

> **Atlas Search:** Sifatli fuzzy/sinonim/autocomplete uchun MongoDB Atlas'da `synonyms` kolleksiyasini "equivalent" mapping sifatida ulash tavsiya etiladi. Hozirgi kod native text-indeks bilan ham (Railway'dagi Mongo'da) ishlaydi.

## Deployment
- **API** → Railway (GitHub auto-deploy, `npm start`)
- **DB** → MongoDB Atlas (Atlas Search uchun) yoki Railway Mongo
- **Rasm** → Cloudflare R2 (`.env` da R2_* to'ldiriladi)
- **SMS** → Eskiz.uz (`.env` da ESKIZ_EMAIL/PASSWORD; production matni Eskiz'da tasdiqlangan bo'lishi kerak)

Productionda majburiy: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` ni o'zgartirish.

## Keyingi qadamlar
Generation/Engine ma'lumotlarini to'ldirish (admin orqali), push bildirishnomalar, ichki chat, pulli e'lon ko'tarish (Payme/Click), va Next.js admin panel + Expo mobil ilova (arxitektura hujjatiga qarang).
# Avto-zapchasty-backend
