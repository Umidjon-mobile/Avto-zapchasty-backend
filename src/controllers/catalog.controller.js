const asyncHandler = require('../utils/asyncHandler');
const { Brand, CarModel, Generation, Engine, PartCategory, PartType, City } = require('../models');

// GET /catalog/brands?popular=1
const getBrands = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.popular) filter.popular = true;
  const brands = await Brand.find(filter).sort({ order: 1, name: 1 }).lean();
  res.json({ brands });
});

// GET /catalog/brands/:id/models
const getModels = asyncHandler(async (req, res) => {
  const models = await CarModel.find({ brandId: req.params.id }).sort({ name: 1 }).lean();
  res.json({ models });
});

// GET /catalog/models/:id/generations
const getGenerations = asyncHandler(async (req, res) => {
  const generations = await Generation.find({ modelId: req.params.id }).sort({ yearFrom: -1 }).lean();
  res.json({ generations });
});

// GET /catalog/generations/:id/engines
const getEngines = asyncHandler(async (req, res) => {
  const engines = await Engine.find({ generationId: req.params.id }).sort({ volume: 1 }).lean();
  res.json({ engines });
});

// GET /catalog/categories  — faqat Level 1 (bosh ekran uchun)
const getCategories = asyncHandler(async (req, res) => {
  const categories = await PartCategory.find({ level: 1, hidden: { $ne: true } })
    .sort({ order: 1 })
    .lean();
  res.json({ categories });
});

// GET /catalog/categories/:id/subcategories  — Level 2 bolalar
const getSubcategories = asyncHandler(async (req, res) => {
  const subcategories = await PartCategory.find({
    parentId: req.params.id,
    hidden: { $ne: true },
  })
    .sort({ order: 1 })
    .lean();
  res.json({ subcategories });
});

// GET /catalog/categories/:id/part-types
const getPartTypesByCategory = asyncHandler(async (req, res) => {
  const partTypes = await PartType.find({ categoryId: req.params.id }).sort({ name: 1 }).lean();
  res.json({ partTypes });
});

// GET /catalog/cities
const getCities = asyncHandler(async (req, res) => {
  const cities = await City.find().sort({ order: 1 }).lean();
  res.json({ cities });
});

module.exports = {
  getBrands, getModels, getGenerations, getEngines,
  getCategories, getSubcategories, getPartTypesByCategory, getCities,
};
