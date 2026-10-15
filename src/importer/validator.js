// Columnas esperadas en el CSV, en el mismo orden del archivo
const COLUMNAS = [
  'correlativo', 'fecha_declaracion', 'aduana', 'tipo_regimen', 'tipo_cambio_dolar',
  'sac', 'descripcion', 'pais', 'tipo_unidad_medida', 'cantidad_fraccion',
  'tasa_dai', 'valor_dai', 'valor_cif_uds', 'tasa_cif_cantidad_fraccion',
];

const OBLIGATORIOS = [
  'correlativo', 'fecha_declaracion', 'aduana', 'tipo_regimen', 'tipo_cambio_dolar',
  'sac', 'pais', 'cantidad_fraccion', 'valor_cif_uds',
];

const NUMERICOS = [
  'tipo_cambio_dolar', 'cantidad_fraccion', 'tasa_dai',
  'valor_dai', 'valor_cif_uds', 'tasa_cif_cantidad_fraccion',
];

// Convierte "YYYY-MM-DD" o "DD/MM/YYYY" a "YYYY-MM-DD"; null si no es una fecha real
function parseFecha(valor) {
  let m = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let [anio, mes, dia] = m ? [m[1], m[2], m[3]] : [];
  if (!m) {
    m = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    [dia, mes, anio] = [m[1], m[2], m[3]];
  }
  // Descarta fechas imposibles como 2024-02-30
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== Number(dia)) return null;
  return `${anio}-${mes}-${dia}`;
}

// Number('') devuelve 0, por eso el vacío se trata aparte como null
function parseNumero(valor) {
  if (valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Valida y normaliza una fila del CSV.
 * Devuelve { ok: true, datos } o { ok: false, errores: [...] }.
 */
function validarFila(campos) {
  if (campos.length !== COLUMNAS.length) {
    return { ok: false, errores: [`Se esperaban ${COLUMNAS.length} columnas y llegaron ${campos.length}`] };
  }

  const errores = [];
  const datos = {};
  // Limpia espacios extra de cada campo
  COLUMNAS.forEach((col, i) => { datos[col] = String(campos[i]).trim().replace(/\s+/g, ' '); });

  for (const col of OBLIGATORIOS) {
    if (datos[col] === '') errores.push(`Campo obligatorio vacío: ${col}`);
  }

  if (datos.fecha_declaracion !== '') {
    const fecha = parseFecha(datos.fecha_declaracion);
    if (!fecha) errores.push(`Fecha inválida: "${datos.fecha_declaracion}"`);
    datos.fecha_declaracion = fecha;
  }

  if (datos.sac !== '' && !/^\d{1,12}$/.test(datos.sac)) {
    errores.push(`SAC inválido: "${datos.sac}"`);
  }

  for (const col of NUMERICOS) {
    const original = datos[col];
    const n = parseNumero(original);
    if (Number.isNaN(n)) errores.push(`Valor numérico inválido en ${col}: "${original}"`);
    else if (n !== null && n < 0) errores.push(`Valor negativo en ${col}: ${n}`);
    datos[col] = n;
  }

  if (datos.tipo_cambio_dolar === 0) errores.push('tipo_cambio_dolar debe ser mayor a 0');

  if (errores.length > 0) return { ok: false, errores };

  // Dato faltante recuperable: la proporción CIF se puede calcular
  if (datos.tasa_cif_cantidad_fraccion === null && datos.cantidad_fraccion > 0) {
    datos.tasa_cif_cantidad_fraccion = datos.valor_cif_uds / datos.cantidad_fraccion;
  }

  // Campos opcionales vacíos se guardan como NULL
  for (const col of ['descripcion', 'tipo_unidad_medida']) {
    if (datos[col] === '') datos[col] = null;
  }

  return { ok: true, datos };
}

module.exports = { COLUMNAS, validarFila, parseFecha };
