const { PartType, Listing } = require('../models');
const { normalizeOem } = require('../utils/crypto');
const { notifyUser } = require('./push.service');

const AUTO_ACTIVATE_MS = 2 * 60 * 1000; // 2 daqiqa

async function autoActivateListing(listingId, sellerId, title) {
  try {
    const listing = await Listing.findById(listingId);
    if (listing && listing.status === 'pending') {
      listing.status = 'active';
      await listing.save();
      notifyUser(sellerId, {
        title: "E'loningiz faollashtirildi ✅",
        body: title,
        data: { type: 'listing_approved', listingId: String(listingId) },
      }).catch(() => {});
    }
  } catch (e) {
    console.error('[auto-activate] Xatolik:', e.message);
  }
}

const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Qidiruv matnini yig'ish: title + desc + ishlab chiqaruvchi + OEM + detal nomi + sinonimlar
async function buildSearchText(data) {
  let ptName = '';
  let ptSyn = [];
  if (data.partTypeId) {
    const pt = await PartType.findById(data.partTypeId).select('name synonyms').lean();
    if (pt) {
      ptName = pt.name;
      ptSyn = pt.synonyms || [];
    }
  }
  return [
    data.title,
    data.description,
    data.manufacturer,
    (data.oemNumbers || []).join(' '),
    ptName,
    ptSyn.join(' '),
  ].filter(Boolean).join(' ').toLowerCase();
}

async function createListing(sellerId, data) {
  const pt = await PartType.findById(data.partTypeId).select('categoryId').lean();
  if (!pt) throw Object.assign(new Error('Detal turi topilmadi'), { statusCode: 400 });

  const searchText = await buildSearchText(data);
  const scheduledActivateAt = new Date(Date.now() + AUTO_ACTIVATE_MS);

  const listing = new Listing({
    ...data,
    sellerId,
    categoryId: pt.categoryId,
    oemNormalized: (data.oemNumbers || []).map(normalizeOem).filter(Boolean),
    searchText,
    status: 'pending',
    scheduledActivateAt,
  });
  await listing.save();

  // 2 daqiqadan keyin avtomatik faollashtirish
  setTimeout(() => autoActivateListing(listing._id, sellerId, listing.title), AUTO_ACTIVATE_MS);

  return listing;
}

async function updateListing(listing, data) {
  Object.assign(listing, data);
  // partType o'zgargan bo'lsa, kategoriyani ham yangilash
  if (data.partTypeId) {
    const pt = await PartType.findById(data.partTypeId).select('categoryId').lean();
    if (pt) listing.categoryId = pt.categoryId;
  }
  listing.searchText = await buildSearchText({
    title: listing.title,
    description: listing.description,
    manufacturer: listing.manufacturer,
    oemNumbers: listing.oemNumbers,
    partTypeId: listing.partTypeId,
  });
  // tahrirdan keyin qayta moderatsiya
  if (listing.status === 'active') listing.status = 'pending';
  await listing.save();
  return listing;
}

module.exports = { createListing, updateListing, buildSearchText, norm, AUTO_ACTIVATE_MS };
