const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/prisma');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const router = express.Router();

// Protegido: listar imagens de um serviço
router.get('/service/:serviceId', async (req, res, next) => {
  try {
    const images = await prisma.serviceImage.findMany({
      where: { serviceId: req.params.serviceId },
      include: { gallery: true }
    });
    res.json(images);
  } catch (err) {
    next(err);
  }
});

const addServiceImageSchema = z.object({
  body: z.object({
    serviceId: z.string().nonempty(),
    galleryId: z.string().optional(),
    url: z.string().url().optional(),
    alt: z.string().optional()
  })
}).refine((data) => data.body.galleryId || data.body.url, {
  message: 'Informe galleryId ou url'
});

// Protegido: adicionar imagem a um serviço
router.post('/', auth, validate(addServiceImageSchema), async (req, res, next) => {
  try {
    const { serviceId, galleryId, url, alt } = req.body;

    const serviceImage = await prisma.serviceImage.create({
      data: {
        serviceId,
        galleryId: galleryId || null,
        url: url || null,
        alt
      },
      include: { gallery: true }
    });

    res.status(201).json(serviceImage);
  } catch (err) {
    next(err);
  }
});

// Protegido: deletar imagem de um serviço
router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.serviceImage.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Imagem do serviço deletada com sucesso' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
