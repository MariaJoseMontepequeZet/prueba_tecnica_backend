const pool = require('../config/db');

// Métricas comunes: el CIF en quetzales usa el tipo de cambio de cada póliza
const METRICAS = `
  COUNT(DISTINCT p.correlativo)                           AS total_polizas,
  COUNT(*)                                                AS total_items,
  ROUND(SUM(i.valor_cif_uds), 2)                          AS total_cif_usd,
  ROUND(SUM(i.valor_cif_uds * p.tipo_cambio_dolar), 2)    AS total_cif_gtq,
  ROUND(COALESCE(SUM(i.valor_dai), 0), 2)                 AS total_dai`;

// Agrupado por país, de mayor a menor CIF
async function porPais() {
  const { rows } = await pool.query(`
    SELECT i.pais, ${METRICAS}
    FROM items i
    JOIN polizas p ON p.correlativo = i.correlativo
    GROUP BY i.pais
    ORDER BY total_cif_usd DESC`);
  return rows;
}

// Agrupado por aduana (dato de la póliza), de mayor a menor CIF
async function porAduana() {
  const { rows } = await pool.query(`
    SELECT p.aduana, ${METRICAS}
    FROM polizas p
    JOIN items i ON i.correlativo = p.correlativo
    GROUP BY p.aduana
    ORDER BY total_cif_usd DESC`);
  return rows;
}

module.exports = { porPais, porAduana };
