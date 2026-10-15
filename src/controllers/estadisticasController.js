const service = require('../services/estadisticasService');

async function porPais(req, res) {
  res.json({ data: await service.porPais() });
}

async function porAduana(req, res) {
  res.json({ data: await service.porAduana() });
}

module.exports = { porPais, porAduana };
