const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { db } = require('../config/env');

// Crea la base de datos (si no existe) y aplica el esquema
async function init() {
  // 1. Conexión a la BD por defecto "postgres" para poder crear la nuestra
  const admin = new Client({ ...db, database: 'postgres' });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [db.database]);
  if (rowCount === 0) {
    // CREATE DATABASE no acepta parámetros ($1), por eso el nombre va entre comillas
    await admin.query(`CREATE DATABASE "${db.database}"`);
    console.log(`Base de datos "${db.database}" creada`);
  }
  await admin.end();

  // 2. Ejecutar schema.sql sobre la BD del proyecto
  const client = new Client(db);
  await client.connect();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await client.query(schema);
  await client.end();
  console.log('Tablas creadas correctamente');
}

init().catch((err) => {
  console.error('Error al inicializar la base de datos:', err.message || err.code);
  process.exit(1);
});
