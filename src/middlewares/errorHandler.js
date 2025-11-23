function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      message: 'Erro de validação',
      details: err.errors
    });
  }

  const status = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(status).json({ message });
}

module.exports = errorHandler;
