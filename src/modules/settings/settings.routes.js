const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/prisma');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const router = express.Router();

// Público: settings básicos
router.get('/public', async (req, res, next) => {
  try {
    const settings = await prisma.settings.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!settings) {
      return res.json(null);
    }

    res.json({
      openingHours: settings.openingHours,
      socialLinks: settings.socialLinks,
      texts: settings.texts
    });
  } catch (err) {
    next(err);
  }
});

// Protegido: obter tudo
router.get('/', auth, async (req, res, next) => {
  try {
    const settings = await prisma.settings.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

const settingsSchema = z.object({
  body: z.object({
    openingHours: z.record(z.any()).optional(),
    socialLinks: z.record(z.any()).optional(),
    texts: z.record(z.any()).optional()
  })
});

// Protegido: atualizar (upsert)
router.put('/', auth, validate(settingsSchema), async (req, res, next) => {
  try {
    const { openingHours, socialLinks, texts } = req.body;

    const existing = await prisma.settings.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    let settings;
    if (existing) {
      settings = await prisma.settings.update({
        where: { id: existing.id },
        data: {
          ...(openingHours ? { openingHours } : {}),
          ...(socialLinks ? { socialLinks } : {}),
          ...(texts ? { texts } : {})
        }
      });
    } else {
      settings = await prisma.settings.create({
        data: {
          openingHours: openingHours || {},
          socialLinks: socialLinks || {},
          texts: texts || {}
        }
      });
    }

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
