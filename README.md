# Prueba_tecnica_backend

API REST en **Node.js + Express + PostgreSQL** que procesa un CSV de pólizas de importación, guarda los datos en una base de datos y los expone por medio de endpoints de consulta y estadísticas.

## Requisitos

- Node.js 18 o superior
- PostgreSQL 14 o superior

## Instalación

```bash
npm install
cp .env.example .env   # completar las credenciales de PostgreSQL
```

## Estructura del proyecto

```
src/
├── config/        # variables de entorno y conexión a la BD
├── db/            # esquema SQL y script de creación
├── importer/      # lectura, validación y carga del CSV
├── services/      # consultas SQL
├── controllers/   # lógica de cada endpoint
├── routes/        # definición de rutas
├── middlewares/   # manejo de errores
├── app.js         # configuración de Express
└── server.js      # punto de entrada
```

## Base de datos

```bash
npm run db:init   # crea la BD (si no existe) y las tablas
```

| Tabla | Descripción |
|---|---|
| `polizas` | Cabecera de cada póliza: `correlativo` (PK), fecha, aduana, régimen y tipo de cambio. |
| `items` | Cada fila del CSV: SAC, descripción, país, cantidades y valores. FK a `polizas`. |
| `registros_rechazados` | Filas del CSV que no pasaron la validación, con la línea y el motivo. |

Se separó la cabecera de los ítems porque un mismo `correlativo` aparece en varias filas con los mismos datos de póliza; así no se repiten y se evita inconsistencia. El `sac` se guarda como texto para no perder ceros a la izquierda.

## Procesamiento del CSV

Copiar el archivo completo a `data/polizas_full.csv` (está en `.gitignore` por su tamaño) y ejecutar:

```bash
npm run import                               # usa CSV_PATH del .env
npm run import -- data/muestra_polizas.csv   # o una ruta específica
```

Cómo funciona:

- **Streaming:** el archivo se lee por partes con `csv-parse`, sin cargar más de un millón de filas en memoria.
- **Inserción por lotes:** se guardan 2000 filas por transacción con `UNNEST`, lo que es mucho más rápido que un `INSERT` por fila.
- **Codificación:** detecta si el archivo es UTF-8 o Latin-1 para no dañar tildes como en "Importación".
- **Reejecutable:** cada importación vacía las tablas antes de cargar, para no duplicar datos.

Validaciones por fila (las filas que fallan se guardan en `registros_rechazados` con su número de línea y el motivo):

| Regla | Ejemplo rechazado |
|---|---|
| 14 columnas exactas | fila cortada o con comas sin comillas |
| Campos obligatorios: `correlativo`, `fecha_declaracion`, `aduana`, `tipo_regimen`, `tipo_cambio_dolar`, `sac`, `pais`, `cantidad_fraccion`, `valor_cif_uds` | `correlativo` vacío |
| Fecha real en formato `YYYY-MM-DD` (también acepta `DD/MM/YYYY`) | `2024-13-45` |
| Campos numéricos válidos y no negativos; `tipo_cambio_dolar` mayor a 0 | `abc`, `-5` |
| `sac` solo con dígitos | `85044A0000` |
| La misma póliza no puede traer cabeceras distintas (fecha, aduana, régimen o tipo de cambio) | mismo correlativo con otra fecha |

Datos faltantes que se pueden recuperar: si `tasa_cif_cantidad_fraccion` viene vacía, se calcula como `valor_cif_uds / cantidad_fraccion`. Los campos opcionales vacíos (`descripcion`, `tipo_unidad_medida`, `tasa_dai`, `valor_dai`) se guardan como `NULL`.

## Pruebas

```bash
npm test
```
