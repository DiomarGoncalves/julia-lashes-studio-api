const rateLimit = require('express-rate-limit');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Muitas tentativas de login. Tente novamente mais tarde.' }
});

const appointmentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Muitos agendamentos criados. Tente novamente mais tarde.' }
});

module.exports = {
  loginRateLimiter,
  appointmentRateLimiter
};
