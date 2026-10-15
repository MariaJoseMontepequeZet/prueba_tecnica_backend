const app = require('./app');
const pool = require('./config/db');
const { port, db } = require('./config/env');

// Punto de entrada: primero verifica la conexión a PostgreSQL y luego levanta el servidor HTTP
async function iniciar() {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    // Mensaje claro en vez de responder 500 en cada endpoint
    console.error(`No se pudo conectar a PostgreSQL (${db.user}@${db.host}:${db.port}/${db.database}): ${err.message || err.code}`);
    console.error('Revisa las credenciales del archivo .env y que hayas ejecutado "npm run db:init".');
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
  });
}

iniciar();
