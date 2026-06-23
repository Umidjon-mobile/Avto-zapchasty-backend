const router = require('express').Router();
const c = require('../controllers/catalog.controller');

router.get('/brands', c.getBrands);
router.get('/brands/:id/models', c.getModels);
router.get('/models/:id/generations', c.getGenerations);
router.get('/generations/:id/engines', c.getEngines);
router.get('/categories', c.getCategories);
router.get('/categories/:id/subcategories', c.getSubcategories);
router.get('/categories/:id/part-types', c.getPartTypesByCategory);
router.get('/cities', c.getCities);

module.exports = router;
