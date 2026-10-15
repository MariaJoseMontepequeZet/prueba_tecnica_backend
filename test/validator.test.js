const { test } = require('node:test');
const assert = require('node:assert');
const { validarFila, parseFecha } = require('../src/importer/validator');

// Fila real tomada del CSV
const filaValida = () => [
  '34853220', '2025-02-14', 'LA ERMITA', 'ID Importación Definitiva', '7.7106',
  '8471410000', 'COMPUTADORAS LENOVO NEO 50Q I5', 'CHINA', 'PIEZAS', '6',
  '0', '0', '4356.9', '726.1499837239584',
];

test('acepta una fila válida y convierte los números', () => {
  const r = validarFila(filaValida());
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.datos.fecha_declaracion, '2025-02-14');
  assert.strictEqual(r.datos.valor_cif_uds, 4356.9);
  assert.strictEqual(r.datos.sac, '8471410000');
});

test('rechaza campos obligatorios vacíos', () => {
  const fila = filaValida();
  fila[0] = '';
  fila[7] = '  ';
  const r = validarFila(fila);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errores.includes('Campo obligatorio vacío: correlativo'));
  assert.ok(r.errores.includes('Campo obligatorio vacío: pais'));
});

test('rechaza fechas con formato o valor inválido', () => {
  assert.strictEqual(parseFecha('2024-02-30'), null);
  assert.strictEqual(parseFecha('14-02-2025'), null);
  assert.strictEqual(parseFecha('14/02/2025'), '2025-02-14');
  const fila = filaValida();
  fila[1] = 'ayer';
  assert.strictEqual(validarFila(fila).ok, false);
});

test('rechaza números inválidos y negativos', () => {
  const fila = filaValida();
  fila[4] = 'abc';
  fila[12] = '-5';
  const r = validarFila(fila);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.errores.length, 2);
});

test('rechaza filas con columnas de más o de menos', () => {
  assert.strictEqual(validarFila(filaValida().slice(0, 10)).ok, false);
});

test('calcula tasa_cif_cantidad_fraccion cuando viene vacía', () => {
  const fila = filaValida();
  fila[13] = '';
  const r = validarFila(fila);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.datos.tasa_cif_cantidad_fraccion, 4356.9 / 6);
});
