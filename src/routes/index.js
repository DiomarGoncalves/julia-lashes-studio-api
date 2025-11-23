const express = require('express');

const authRoutes = require('../modules/auth/auth.routes');
const serviceRoutes = require('../modules/services/service.routes');
const serviceImagesRoutes = require('../modules/services/service-images.routes');
const clientRoutes = require('../modules/clients/client.routes');
const appointmentRoutes = require('../modules/appointments/appointment.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const galleryRoutes = require('../modules/gallery/gallery.routes');
const testimonialRoutes = require('../modules/testimonials/testimonial.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/service-images', serviceImagesRoutes);
router.use('/clients', clientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/settings', settingsRoutes);
router.use('/gallery', galleryRoutes);
router.use('/testimonials', testimonialRoutes);

module.exports = router;
