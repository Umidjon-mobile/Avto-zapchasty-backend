const asyncHandler = require('../utils/asyncHandler');
const searchService = require('../services/search.service');

// GET /search
const search = asyncHandler(async (req, res) => {
  const result = await searchService.searchListings(req.query);
  res.json(result);
});

// GET /search/suggest?q=
const suggest = asyncHandler(async (req, res) => {
  const items = await searchService.suggest(req.query.q || '', req.query.limit || 10);
  res.json({ items });
});

// GET /search/oem/:number
const byOem = asyncHandler(async (req, res) => {
  const result = await searchService.searchByOem(req.params.number, {
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 20, 50),
  });
  res.json(result);
});

module.exports = { search, suggest, byOem };
