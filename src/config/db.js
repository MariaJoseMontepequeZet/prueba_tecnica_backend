const { Pool } = require('pg');
const { db } = require('./env');

// Pool de conexiones reutilizable en toda la app
const pool = new Pool(db);

module.exports = pool;
