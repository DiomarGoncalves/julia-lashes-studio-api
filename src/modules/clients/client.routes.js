const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/prisma');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const router = express.Router();

// Schema de paginação
const listSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    perPage: z.string().optional(),
    search: z.string().optional()
  })
});

router.get('/', auth, validate(listSchema), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.perPage || '20', 10);
    const search = req.query.search || '';

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { name: 'asc' }
      }),
      prisma.client.count({ where })
    ]);

    res.json({
      items,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage)
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: {
          include: { service: true },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    res.json(client);
  } catch (err) {
    next(err);
  }
});

const upsertClientSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().min(8)
  })
});

router.post('/', auth, validate(upsertClientSchema), async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    const client = await prisma.client.create({
      data: { name, phone }
    });

    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, validate(upsertClientSchema), async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { name, phone }
    });

    res.json(client);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
