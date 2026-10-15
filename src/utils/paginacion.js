const HttpError = require('./httpError');

const LIMITE_MAXIMO = 100;

// Lee ?page y ?limit, valida y calcula el OFFSET para SQL
function obtenerPaginacion(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);

  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'page debe ser un entero mayor o igual a 1');
  if (!Number.isInteger(limit) || limit < 1 || limit > LIMITE_MAXIMO) {
    throw new HttpError(400, `limit debe ser un entero entre 1 y ${LIMITE_MAXIMO}`);
  }
  return { page, limit, offset: (page - 1) * limit };
}

// Arma la respuesta estándar de los listados paginados
function respuestaPaginada(data, total, { page, limit }) {
  return {
    data,
    paginacion: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = { obtenerPaginacion, respuestaPaginada };
