const router = require('express').Router();
const c = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const v = require('../validators/auth.validator');
const { auth } = require('../middleware/auth');
const { otpLimiter } = require('../middleware/rateLimit');

router.post('/send-otp', otpLimiter, validate(v.sendOtp), c.sendOtp);
router.post('/verify-otp', validate(v.verifyOtp), c.verifyOtp);
router.post('/register', validate(v.register), c.register);
router.post('/login', validate(v.login), c.login);
router.post('/refresh', validate(v.refresh), c.refresh);
router.post('/logout', auth, c.logout);
router.get('/me', auth, c.me);
router.patch('/me', auth, validate(v.updateProfile), c.updateProfile);

module.exports = router;
