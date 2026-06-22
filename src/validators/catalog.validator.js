const { z } = require('zod');
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Yaroqsiz ID');

const searchQuery = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});

module.exports = { objectId, searchQuery };
