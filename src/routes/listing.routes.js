const router = require('express').Router();
const c = require('../controllers/listing.controller');
const validate = require('../middleware/validate');
const v = require('../validators/listing.validator');
const { auth, optionalAuth } = require('../middleware/auth');

// maxsus yo'llar :id dan oldin
router.get('/', validate(v.listQuery, 'query'), c.list);
router.get('/my', auth, c.myListings);
router.get('/favorites/list', auth, c.getFavorites);

router.post('/', auth, validate(v.create), c.create);

router.get('/:id', optionalAuth, c.getOne);
router.patch('/:id', auth, validate(v.update), c.update);
router.delete('/:id', auth, c.remove);
router.patch('/:id/status', auth, c.setStatus);
router.post('/:id/favorite', auth, c.toggleFavorite);

module.exports = router;
