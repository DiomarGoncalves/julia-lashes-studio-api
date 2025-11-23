const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const config = require('./config/env');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;
