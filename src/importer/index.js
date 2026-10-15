const { importarCsv } = require('./importCsv');
const pool = require('../config/db');
const { csvPath } = require('../config/env');

// Uso: npm run import [-- ruta/al/archivo.csv]
async function main() {
  // Ruta por argumento o, si no se envía, la del .env
  const ruta = process.argv[2] || csvPath;
  console.log(`Importando ${ruta}...`);
  const inicio = Date.now();

  const resumen = await importarCsv(ruta);

  console.log('Importación finalizada:');
  console.table({ ...resumen, segundos: ((Date.now() - inicio) / 1000).toFixed(1) });
  if (resumen.filasRechazadas > 0) {
    console.log('Revisa el detalle en la tabla registros_rechazados.');
  }
}

main()
  .catch((err) => {
    console.error('Error en la importación:', err.message);
    process.exitCode = 1;
  })
  // Cierra las conexiones para que el proceso termine
  .finally(() => pool.end());
