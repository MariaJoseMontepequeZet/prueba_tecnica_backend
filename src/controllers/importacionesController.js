const service = require('../services/importacionesService');
const HttpError = require('../utils/httpError');
const { obtenerPaginacion, respuestaPaginada } = require('../utils/paginacion');

// GET /importaciones?page=&limit=
async function listar(req, res) {
  const paginacion = obtenerPaginacion(req.query);
  const { data, total } = await service.listar(paginacion);
  res.json(respuestaPaginada(data, total, paginacion));
}

// GET /importaciones/:correlativo (400 si es inválido, 404 si no existe)
async function obtenerPorCorrelativo(req, res) {
  const { correlativo } = req.params;
  if (!/^[\w-]{1,20}$/.test(correlativo)) throw new HttpError(400, 'Correlativo inválido');

  const poliza = await service.obtenerPorCorrelativo(correlativo);
  if (!poliza) throw new HttpError(404, `No existe la póliza ${correlativo}`);
  res.json(poliza);
}

// GET /importaciones/sac/:sac?page=&limit=
async function listarPorSac(req, res) {
  const { sac } = req.params;
  if (!/^\d{1,12}$/.test(sac)) throw new HttpError(400, 'El SAC debe contener solo dígitos');

  const paginacion = obtenerPaginacion(req.query);
  const { data, total } = await service.listarPorSac(sac, paginacion);
  res.json(respuestaPaginada(data, total, paginacion));
}

module.exports = { listar, obtenerPorCorrelativo, listarPorSac };
