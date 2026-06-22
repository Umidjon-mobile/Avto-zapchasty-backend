const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/catalog', require('./catalog.routes'));
router.use('/search', require('./search.routes'));
router.use('/listings', require('./listing.routes'));
router.use('/upload', require('./upload.routes'));
router.use('/users', require('./user.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/chat', require('./chat.routes'));
router.use('/reports', require('./report.routes'));

module.exports = router;
