function validate(schema) {
  return (req, res, next) => {
    try {
      const data = {
        body: req.body,
        query: req.query,
        params: req.params
      };
      schema.parse(data);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
