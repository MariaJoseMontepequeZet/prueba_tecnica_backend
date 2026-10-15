const { Pool, types } = require('pg');
const { db } = require('./env');

// pg devuelve NUMERIC y BIGINT como texto; se convierten a número para el JSON
types.setTypeParser(types.builtins.NUMERIC, (v) => parseFloat(v));
types.setTypeParser(types.builtins.INT8, (v) => parseInt(v, 10));
// DATE como texto "YYYY-MM-DD" para evitar desfases por zona horaria
types.setTypeParser(types.builtins.DATE, (v) => v);

// Pool de conexiones reutilizable en toda la app
const pool = new Pool(db);

module.exports = pool;
