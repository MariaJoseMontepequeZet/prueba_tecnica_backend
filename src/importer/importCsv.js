const fs = require('fs');
const { parse } = require('csv-parse');
const pool = require('../config/db');
const { COLUMNAS, validarFila } = require('./validator');

// Filas que se guardan por transacción: equilibrio entre velocidad y memoria
const TAMANO_LOTE = 2000;

// Si el archivo no es UTF-8 válido se asume Latin-1 (común en CSV exportados desde Excel)
function detectarCodificacion(ruta) {
  // Solo se revisa el primer 1 MB, suficiente para detectar la codificación
  const fd = fs.openSync(ruta, 'r');
  const buffer = Buffer.alloc(1024 * 1024);
  const leidos = fs.readSync(fd, buffer, 0, buffer.length, 0);
  fs.closeSync(fd);
  try {
    // fatal: true lanza error si encuentra bytes que no son UTF-8
    new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, leidos), { stream: true });
    return 'utf8';
  } catch {
    return 'latin1';
  }
}

// Inserta un lote de ítems y sus pólizas en una sola transacción
async function guardarLote(client, items, polizasNuevas) {
  // Transacción: si algo falla se deshace el lote completo y no quedan datos a medias
  await client.query('BEGIN');
  try {
    // Primero las pólizas, porque items tiene una llave foránea hacia polizas
    if (polizasNuevas.length > 0) {
      // UNNEST permite insertar miles de filas con una sola consulta y pocos parámetros
      await client.query(
        `INSERT INTO polizas (correlativo, fecha_declaracion, aduana, tipo_regimen, tipo_cambio_dolar)
          SELECT * FROM UNNEST($1::varchar[], $2::date[], $3::varchar[], $4::varchar[], $5::numeric[])
          ON CONFLICT (correlativo) DO NOTHING`,
        // Se arma un arreglo por columna: [[correlativos], [fechas], ...]
        ['correlativo', 'fecha_declaracion', 'aduana', 'tipo_regimen', 'tipo_cambio_dolar']
          .map((col) => polizasNuevas.map((p) => p[col])),
      );
    }
    // Después los ítems del lote
    const columnasItem = [
      'correlativo', 'sac', 'descripcion', 'pais', 'tipo_unidad_medida', 'cantidad_fraccion',
      'tasa_dai', 'valor_dai', 'valor_cif_uds', 'tasa_cif_cantidad_fraccion',
    ];
    await client.query(
      `INSERT INTO items (${columnasItem.join(', ')})
       SELECT * FROM UNNEST($1::varchar[], $2::varchar[], $3::text[], $4::varchar[], $5::varchar[],
                            $6::numeric[], $7::numeric[], $8::numeric[], $9::numeric[], $10::numeric[])`,
      columnasItem.map((col) => items.map((it) => it[col])),
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

// Guarda las filas inválidas con su número de línea y motivo para poder revisarlas
async function guardarRechazos(client, rechazos) {
  await client.query(
    `INSERT INTO registros_rechazados (linea, motivo, contenido)
     SELECT * FROM UNNEST($1::int[], $2::text[], $3::text[])`,
    [rechazos.map((r) => r.linea), rechazos.map((r) => r.motivo), rechazos.map((r) => r.contenido)],
  );
}

/**
 * Lee el CSV por streaming (no carga el archivo completo en memoria),
 * valida cada fila y guarda en lotes. Las filas inválidas van a registros_rechazados.
 */
async function importarCsv(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`No se encontró el archivo: ${ruta}`);

  const codificacion = detectarCodificacion(ruta);
  // bom: ignora la marca BOM inicial; relax_*: no detiene la lectura por una fila mal formada,
  // esa fila se rechaza después en la validación; info: da el número de línea de cada fila
  const parser = fs.createReadStream(ruta, { encoding: codificacion }).pipe(
    parse({ bom: true, skip_empty_lines: true, relax_column_count: true, relax_quotes: true, info: true }),
  );

  // Contadores que se muestran al terminar la importación
  const resumen = { codificacion, filasLeidas: 0, filasValidas: 0, filasRechazadas: 0, polizas: 0 };
  // correlativo -> cabecera, para detectar pólizas con datos de cabecera contradictorios
  const cabeceras = new Map();
  // Acumuladores del lote actual
  let items = [];
  let polizasNuevas = [];
  let rechazos = [];
  let esEncabezado = true;

  const client = await pool.connect();
  try {
    // La importación reemplaza los datos anteriores para poder ejecutarla varias veces
    await client.query('TRUNCATE items, polizas, registros_rechazados RESTART IDENTITY');

    // for await procesa una fila a la vez conforme se va leyendo el archivo
    for await (const { record, info } of parser) {
      // La primera fila debe ser el encabezado con las 14 columnas esperadas
      if (esEncabezado) {
        const encabezado = record.map((c) => c.trim().toLowerCase());
        if (encabezado.join(',') !== COLUMNAS.join(',')) {
          throw new Error(`Encabezado inesperado: ${record.join(',')}`);
        }
        esEncabezado = false;
        continue;
      }

      resumen.filasLeidas++;
      const resultado = validarFila(record);
      let errores = resultado.errores;

      if (resultado.ok) {
        const d = resultado.datos;
        // Todas las filas de una misma póliza deben traer la misma cabecera
        const cabecera = `${d.fecha_declaracion}|${d.aduana}|${d.tipo_regimen}|${d.tipo_cambio_dolar}`;
        const previa = cabeceras.get(d.correlativo);

        if (previa === undefined) {
          // Primera vez que aparece este correlativo: se registra la póliza
          cabeceras.set(d.correlativo, cabecera);
          polizasNuevas.push(d);
        } else if (previa !== cabecera) {
          errores = [`Cabecera distinta a la ya registrada para la póliza ${d.correlativo}`];
        }
        if (!errores) items.push(d); // fila válida, se agrega al lote
      }

      if (errores) {
        rechazos.push({ linea: info.lines, motivo: errores.join('; '), contenido: record.join(',') });
      }

      // Cuando el lote se llena se guarda en la BD y se vacía la memoria
      if (items.length >= TAMANO_LOTE) {
        await guardarLote(client, items, polizasNuevas);
        resumen.filasValidas += items.length;
        items = [];
        polizasNuevas = [];
      }
      if (rechazos.length >= TAMANO_LOTE) {
        await guardarRechazos(client, rechazos);
        resumen.filasRechazadas += rechazos.length;
        rechazos = [];
      }
      // Mensaje de progreso para archivos grandes
      if (resumen.filasLeidas % 100000 === 0) console.log(`  ${resumen.filasLeidas} filas procesadas...`);
    }

    // Últimos registros que no completaron un lote
    if (items.length > 0) await guardarLote(client, items, polizasNuevas);
    if (rechazos.length > 0) await guardarRechazos(client, rechazos);
    resumen.filasValidas += items.length;
    resumen.filasRechazadas += rechazos.length;
    resumen.polizas = cabeceras.size;
  } finally {
    // Devuelve la conexión al pool aunque haya ocurrido un error
    client.release();
  }

  return resumen;
}

module.exports = { importarCsv };
