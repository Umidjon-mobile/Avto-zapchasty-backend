const router = require('express').Router();
const c = require('../controllers/chat.controller');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/conversations', c.listConversations);
router.post('/conversations', c.getOrCreateConversation);
router.get('/conversations/:id', c.getConversation);
router.get('/conversations/:id/messages', c.getMessages);
router.post('/conversations/:id/messages', c.sendMessage);
router.post('/conversations/:id/read', c.markRead);

module.exports = router;
