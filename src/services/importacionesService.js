const pool = require('../config/db');

// Cada importación es un ítem con los datos de cabecera de su póliza
const SELECT_IMPORTACION = `
  SELECT i.id, p.correlativo, p.fecha_declaracion, p.aduana, p.tipo_regimen, p.tipo_cambio_dolar,
         i.sac, i.descripcion, i.pais, i.tipo_unidad_medida, i.cantidad_fraccion,
         i.tasa_dai, i.valor_dai, i.valor_cif_uds, i.tasa_cif_cantidad_fraccion
  FROM items i
  JOIN polizas p ON p.correlativo = i.correlativo`;

// Página de datos y total en paralelo; $1, $2 son parámetros (evitan inyección SQL)
async function listar({ limit, offset }) {
  const [filas, conteo] = await Promise.all([
    pool.query(`${SELECT_IMPORTACION} ORDER BY i.id LIMIT $1 OFFSET $2`, [limit, offset]),
    pool.query('SELECT COUNT(*) AS total FROM items'),
  ]);
  return { data: filas.rows, total: conteo.rows[0].total };
}

// Póliza con sus ítems y totales; null si no existe
async function obtenerPorCorrelativo(correlativo) {
  const poliza = await pool.query('SELECT * FROM polizas WHERE correlativo = $1', [correlativo]);
  if (poliza.rowCount === 0) return null;

  const items = await pool.query(
    `SELECT id, sac, descripcion, pais, tipo_unidad_medida, cantidad_fraccion,
            tasa_dai, valor_dai, valor_cif_uds, tasa_cif_cantidad_fraccion
     FROM items WHERE correlativo = $1 ORDER BY id`,
    [correlativo],
  );

  // Totales de la póliza a partir de sus ítems
  const totales = items.rows.reduce(
    (acc, it) => ({
      total_items: acc.total_items + 1,
      total_cif_usd: acc.total_cif_usd + it.valor_cif_uds,
      total_dai: acc.total_dai + (it.valor_dai || 0),
    }),
    { total_items: 0, total_cif_usd: 0, total_dai: 0 },
  );
  totales.total_cif_usd = Number(totales.total_cif_usd.toFixed(2));
  totales.total_dai = Number(totales.total_dai.toFixed(2));

  return { ...poliza.rows[0], totales, items: items.rows };
}

async function listarPorSac(sac, { limit, offset }) {
  const [filas, conteo] = await Promise.all([
    pool.query(`${SELECT_IMPORTACION} WHERE i.sac = $1 ORDER BY i.id LIMIT $2 OFFSET $3`, [sac, limit, offset]),
    pool.query('SELECT COUNT(*) AS total FROM items WHERE sac = $1', [sac]),
  ]);
  return { data: filas.rows, total: conteo.rows[0].total };
}

module.exports = { listar, obtenerPorCorrelativo, listarPorSac };
