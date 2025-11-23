const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/prisma');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const router = express.Router();

// Público: listar serviços ativos
router.get('/', async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

// Público: detalhe de serviço
router.get('/:id', async (req, res, next) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id }
    });
    if (!service || !service.active) {
      return res.status(404).json({ message: 'Serviço não encontrado' });
    }
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// Schema com preprocess para converter strings em números
const upsertServiceSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    durationMinutes: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive()
    ),
    price: z.preprocess(
      (val) => (typeof val === 'string' ? parseFloat(val) : val),
      z.number().nonnegative()
    ),
    active: z.boolean().optional()
  })
});

// Protegido: criar serviço
router.post('/', auth, validate(upsertServiceSchema), async (req, res, next) => {
  try {
    const { name, description, durationMinutes, price, active = true } = req.body;

    const service = await prisma.service.create({
      data: {
        name,
        description,
        durationMinutes,
        price,
        active
      }
    });

    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
});

// Protegido: atualizar serviço
router.put('/:id', auth, validate(upsertServiceSchema), async (req, res, next) => {
  try {
    const { name, description, durationMinutes, price, active } = req.body;

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        durationMinutes,
        price,
        ...(active !== undefined ? { active } : {})
      }
    });

    res.json(service);
  } catch (err) {
    next(err);
  }
});

// Protegido: ativar/desativar serviço
const activateSchema = z.object({
  body: z.object({
    active: z.boolean()
  })
});

router.patch('/:id/activate', auth, validate(activateSchema), async (req, res, next) => {
  try {
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: { active: req.body.active }
    });
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// Protegido: deletar serviço (com cascata de agendamentos)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    // Opção 1: Deletar agendamentos relacionados primeiro
    await prisma.appointment.deleteMany({
      where: { serviceId: req.params.id }
    });

    // Depois deletar o serviço
    await prisma.service.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Serviço deletado com sucesso' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
