const service = require('../services/estadisticasService');

// GET /estadisticas/por-pais
async function porPais(req, res) {
  res.json({ data: await service.porPais() });
}

// GET /estadisticas/por-aduana
async function porAduana(req, res) {
  res.json({ data: await service.porAduana() });
}

module.exports = { porPais, porAduana };
