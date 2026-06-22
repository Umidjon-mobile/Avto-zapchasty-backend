const router = require('express').Router();
const c = require('../controllers/admin.controller');
const { auth } = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Barcha admin yo'llari: auth + admin/superadmin roli
router.use(auth, requireRole('admin', 'superadmin'));

// E'lonlar moderatsiyasi
router.get('/listings', c.listListings);
router.patch('/listings/:id/moderate', c.moderateListing);

// Foydalanuvchilar
router.get('/users', c.listUsers);
router.patch('/users/:id', c.updateUser);

// Analitika
router.get('/analytics', c.analytics);

// Katalog ro'yxatlari (GET)
router.get('/synonyms', c.listSynonyms);
router.get('/part-types', c.listPartTypes);

// Shikoyatlar
router.get('/reports', c.listReports);
router.patch('/reports/:id', c.resolveReport);

// Push broadcast
router.post('/notifications/broadcast', c.broadcastNotification);

// ---- Katalog CRUD ----
const mountCrud = (base, h) => {
  router.post(base, h.create);
  router.patch(`${base}/:id`, h.update);
  router.delete(`${base}/:id`, h.remove);
};
mountCrud('/brands', c.brands);
mountCrud('/models', c.models);
mountCrud('/generations', c.generations);
mountCrud('/engines', c.engines);
mountCrud('/categories', c.categories);
mountCrud('/part-types', c.partTypes);
mountCrud('/synonyms', c.synonyms);
mountCrud('/cities', c.cities);

module.exports = router;
