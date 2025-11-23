const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/prisma');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const router = express.Router();

// Público: listar galeria
router.get('/', async (req, res, next) => {
  try {
    const images = await prisma.gallery.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(images);
  } catch (err) {
    next(err);
  }
});

const addImageSchema = z.object({
  body: z.object({
    url: z.string().url(),
    alt: z.string().optional()
  })
});

// Protegido: adicionar imagem à galeria
router.post('/', auth, validate(addImageSchema), async (req, res, next) => {
  try {
    const { url, alt } = req.body;

    const image = await prisma.gallery.create({
      data: { url, alt }
    });

    res.status(201).json(image);
  } catch (err) {
    next(err);
  }
});

// Protegido: deletar imagem da galeria
router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.gallery.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Imagem deletada com sucesso' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
