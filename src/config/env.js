require('dotenv').config();

// Configuración centralizada: un solo lugar para leer variables de entorno
module.exports = {
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'polizas_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  },
  csvPath: process.env.CSV_PATH || 'docs/polizas_full.csv',
};
