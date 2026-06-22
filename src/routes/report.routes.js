const router = require('express').Router();
const c = require('../controllers/report.controller');
const { auth } = require('../middleware/auth');

router.post('/', auth, c.createReport);

module.exports = router;
