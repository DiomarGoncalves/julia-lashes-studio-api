const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/prisma');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { appointmentRateLimiter } = require('../../middlewares/rateLimiter');

const router = express.Router();

// -------- Disponibilidade pública --------
const availabilitySchema = z.object({
  query: z.object({
    serviceId: z.string().nonempty(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD
  })
});

router.get('/availability', validate(availabilitySchema), async (req, res, next) => {
  try {
    const { serviceId, date } = req.query;

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.active) {
      return res.status(400).json({ message: 'Serviço inválido' });
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');

    const appointments = await prisma.appointment.findMany({
      where: { serviceId, date: dateObj }
    });

    const bookedTimes = new Set(appointments.map(a => a.time));

    // Lógica simples de horário de funcionamento (poderia vir de Settings)
    const openingHour = 9;
    const closingHour = 18;

    const availableTimes = [];
    const duration = service.durationMinutes;
    for (let hour = openingHour; hour < closingHour; hour++) {
      for (let minute = 0; minute < 60; minute += duration) {
        const hh = String(hour).padStart(2, '0');
        const mm = String(minute).padStart(2, '0');
        const time = `${hh}:${mm}`;
        if (!bookedTimes.has(time)) {
          availableTimes.push(time);
        }
      }
    }

    res.json({ date, serviceId, availableTimes });
  } catch (err) {
    next(err);
  }
});

// -------- Criação pública de agendamento --------
const publicAppointmentSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().min(8),
    serviceId: z.string().nonempty(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    notes: z.string().optional()
  })
});

router.post('/', appointmentRateLimiter, validate(publicAppointmentSchema), async (req, res, next) => {
  try {
    const { name, phone, serviceId, date, time, notes } = req.body;

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.active) {
      return res.status(400).json({ message: 'Serviço inválido' });
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');

    const existing = await prisma.appointment.findFirst({
      where: { serviceId, date: dateObj, time }
    });

    if (existing) {
      return res.status(409).json({ message: 'Horário já ocupado para este serviço' });
    }

    let client = await prisma.client.findFirst({
      where: { phone }
    });

    if (!client) {
      client = await prisma.client.create({
        data: { name, phone }
      });
    } else if (client.name !== name) {
      client = await prisma.client.update({
        where: { id: client.id },
        data: { name }
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        serviceId,
        date: dateObj,
        time,
        status: 'scheduled',
        notes
      },
      include: {
        client: true,
        service: true
      }
    });

    // Ponto de integração para WhatsApp/e-mail (notificações)
    // ex.: await notificationService.sendAppointmentConfirmation(appointment);

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

// -------- Listagem protegida --------
const listAppointmentsSchema = z.object({
  query: z.object({
    date: z.string().optional(),
    status: z.string().optional()
  })
});

router.get('/', auth, validate(listAppointmentsSchema), async (req, res, next) => {
  try {
    const { date, status } = req.query;

    const where = {};

    if (date) {
      const d = new Date(date + 'T00:00:00.000Z');
      where.date = d;
    }

    if (status) {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: {
        client: true,
        service: true
      }
    });

    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

// -------- Detalhe protegido --------
router.get('/:id', auth, async (req, res, next) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        service: true
      }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }

    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

// -------- Atualizar status --------
const statusSchema = z.object({
  body: z.object({
    status: z.enum(['scheduled', 'done', 'canceled', 'no_show'])
  })
});

router.patch('/:id/status', auth, validate(statusSchema), async (req, res, next) => {
  try {
    const { status } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

// -------- Agendamento manual (dona) --------
const manualSchema = z.object({
  body: z.object({
    clientId: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    serviceId: z.string().nonempty(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    status: z.enum(['scheduled', 'done', 'canceled', 'no_show']).optional(),
    notes: z.string().optional()
  })
}).refine((data) => data.body.clientId || (data.body.name && data.body.phone), {
  message: 'Informe clientId ou (name e phone)',
  path: ['body']
});

router.post('/manual', auth, validate(manualSchema), async (req, res, next) => {
  try {
    const { clientId, name, phone, serviceId, date, time, status = 'scheduled', notes } = req.body;

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.active) {
      return res.status(400).json({ message: 'Serviço inválido' });
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');

    const existing = await prisma.appointment.findFirst({
      where: { serviceId, date: dateObj, time }
    });

    if (existing) {
      return res.status(409).json({ message: 'Horário já ocupado para este serviço' });
    }

    let finalClientId = clientId;

    if (!finalClientId) {
      let client = await prisma.client.findFirst({ where: { phone } });
      if (!client) {
        client = await prisma.client.create({ data: { name, phone } });
      }
      finalClientId = client.id;
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId: finalClientId,
        serviceId,
        date: dateObj,
        time,
        status,
        notes
      },
      include: {
        client: true,
        service: true
      }
    });

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
