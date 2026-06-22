const router = require('express').Router();
const c = require('../controllers/search.controller');
const validate = require('../middleware/validate');
const { listQuery } = require('../validators/listing.validator');

router.get('/', validate(listQuery, 'query'), c.search);
router.get('/suggest', c.suggest);
router.get('/oem/:number', c.byOem);

module.exports = router;
