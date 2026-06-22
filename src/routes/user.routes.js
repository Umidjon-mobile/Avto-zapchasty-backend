const router = require('express').Router();
const c = require('../controllers/user.controller');
const { auth } = require('../middleware/auth');

// Push token (auth)
router.post('/push-token', auth, c.registerPushToken);
router.delete('/push-token', auth, c.removePushToken);

// Ochiq sotuvchi profili
router.get('/:id/profile', c.getPublicProfile);

module.exports = router;
