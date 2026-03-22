const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const router = express.Router();

/** Raw OpenAPI JSON (for clients, codegen, or Swagger UI config) */
router.get('/swagger.json', (req, res) => {
  res.json(swaggerDocument);
});

// serve is an array of middleware (init + static assets)
router.use(swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customSiteTitle: 'Phoenix Payment Service API',
  }),
);

module.exports = router;
