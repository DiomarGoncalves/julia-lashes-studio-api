const express = require('express');
const { z } = require('zod');
const crypto = require('crypto');
const prisma = require('../../config/prisma');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const router = express.Router();

// Função auxiliar para gerar link único
function generateUniqueLink() {
  return crypto.randomBytes(16).toString('hex');
}

// Público: listar depoimentos publicados (para site)
router.get('/published', async (req, res, next) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientName: true,
        text: true,
        rating: true,
        createdAt: true
      }
    });
    res.json(testimonials);
  } catch (err) {
    next(err);
  }
});

// Protegido: listar todos os depoimentos (admin)
router.get('/', auth, async (req, res, next) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' },
      include: { appointment: { include: { service: true, client: true } } }
    });
    res.json(testimonials);
  } catch (err) {
    next(err);
  }
});

// Protegido: criar link de depoimento para um agendamento
router.post('/generate-link/:appointmentId', auth, async (req, res, next) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: { client: true }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }

    // Verificar se já existe depoimento
    const existing = await prisma.testimonial.findUnique({
      where: { appointmentId: req.params.appointmentId }
    });

    if (existing) {
      return res.json(existing);
    }

    const uniqueLink = generateUniqueLink();

    const testimonial = await prisma.testimonial.create({
      data: {
        appointmentId: req.params.appointmentId,
        clientName: appointment.client.name,
        clientPhone: appointment.client.phone,
        uniqueLink,
        rating: 0,
        text: '',
        status: 'pending'
      }
    });

    res.status(201).json(testimonial);
  } catch (err) {
    next(err);
  }
});

// Protegido: obter link de depoimento para enviar via WhatsApp
router.get('/link-info/:appointmentId', auth, async (req, res, next) => {
  try {
    const testimonial = await prisma.testimonial.findUnique({
      where: { appointmentId: req.params.appointmentId }
    });

    if (!testimonial) {
      return res.status(404).json({ message: 'Link de depoimento não gerado' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const testimonialUrl = `${baseUrl}/depoimento/${testimonial.uniqueLink}`;

    res.json({
      uniqueLink: testimonial.uniqueLink,
      url: testimonialUrl,
      whatsappMessage: encodeURIComponent(
        `Oi ${testimonial.clientName}! 👋\n\nGostaria de saber sua opinião sobre o atendimento! Deixe seu depoimento aqui: ${testimonialUrl}\n\nObrigada! 💕`
      )
    });
  } catch (err) {
    next(err);
  }
});

// Público: formulário de depoimento (por link único)
router.get('/public/:uniqueLink', async (req, res, next) => {
  try {
    const testimonial = await prisma.testimonial.findUnique({
      where: { uniqueLink: req.params.uniqueLink },
      include: { appointment: { include: { service: true } } }
    });

    if (!testimonial) {
      return res.status(404).json({ message: 'Link de depoimento inválido' });
    }

    res.json({
      clientName: testimonial.clientName,
      serviceName: testimonial.appointment.service.name,
      status: testimonial.status
    });
  } catch (err) {
    next(err);
  }
});

const submitTestimonialSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    text: z.string().min(10)
  })
});

// Público: enviar depoimento
router.post('/submit/:uniqueLink', validate(submitTestimonialSchema), async (req, res, next) => {
  try {
    const { rating, text } = req.body;

    const testimonial = await prisma.testimonial.findUnique({
      where: { uniqueLink: req.params.uniqueLink }
    });

    if (!testimonial) {
      return res.status(404).json({ message: 'Link de depoimento inválido' });
    }

    if (testimonial.status !== 'pending') {
      return res.status(400).json({ message: 'Este depoimento já foi enviado' });
    }

    const updated = await prisma.testimonial.update({
      where: { id: testimonial.id },
      data: {
        rating,
        text,
        status: 'published'
      }
    });

    res.json({ message: 'Depoimento enviado com sucesso!', testimonial: updated });
  } catch (err) {
    next(err);
  }
});

// Protegido: deletar depoimento
router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.testimonial.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Depoimento deletado com sucesso' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
