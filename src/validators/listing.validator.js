const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Yaroqsiz ID');

const fitment = z.object({
  brandId: objectId.optional(),
  modelId: objectId.optional(),
  generationId: objectId.optional(),
  engineId: objectId.optional(),
}).optional();

const create = z.object({
  partTypeId: objectId,
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional().default(''),
  oemNumbers: z.array(z.string().max(60)).optional().default([]),
  vin: z.string().max(40).optional().default(''),
  article: z.string().max(60).optional().default(''),
  condition: z.enum(['new', 'used', 'contract', 'original', 'duplicate']),
  manufacturer: z.string().max(120).optional().default(''),
  price: z.object({
    amount: z.number().nonnegative(),
    currency: z.string().default('UZS'),
  }),
  negotiable: z.boolean().optional().default(false),
  fitment,
  compatibleVehicles: z.array(z.object({
    brandId: objectId.optional(),
    modelId: objectId.optional(),
    generationId: objectId.optional(),
  })).optional().default([]),
  attributes: z.object({
    side: z.enum(['left', 'right']).nullable().optional(),
    position: z.enum(['front', 'rear']).nullable().optional(),
  }).optional(),
  photos: z.array(z.string()).optional().default([]),
  city: z.string().max(80).optional().default(''),
  delivery: z.boolean().optional().default(false),
  phone: z.string().max(20).optional().default(''),
});

const update = create.partial();

const listQuery = z.object({
  q: z.string().optional(),
  categoryId: objectId.optional(),
  brandId: objectId.optional(),
  modelId: objectId.optional(),
  condition: z.enum(['new', 'used', 'contract', 'original', 'duplicate']).optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['relevance', 'newest', 'cheap', 'expensive']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

module.exports = { create, update, listQuery };
