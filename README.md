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

El archivo completo va en `docs/polizas_full.csv` (está en `.gitignore` porque supera el límite de 100 MB de GitHub) y ejecutar:

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

## API REST

```bash
npm start      # o "npm run dev" para reiniciar al guardar cambios
```

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/importaciones?page=1&limit=20` | Lista todas las importaciones (ítems con los datos de su póliza), paginadas. `limit` máximo 100. |
| GET | `/importaciones/{correlativo}` | Una póliza con sus ítems y totales (CIF y DAI). |
| GET | `/importaciones/sac/{sac}?page=1&limit=20` | Importaciones de una partida arancelaria (SAC), paginadas. |
| GET | `/estadisticas/por-pais` | Por país: pólizas, ítems, CIF en USD y en GTQ, y DAI total. |
| GET | `/estadisticas/por-aduana` | Mismo resumen agrupado por aduana. |

> **Decisión de diseño:** el enunciado pide `/importaciones/{correlativo}` y `/importaciones/{sac}`, pero las dos rutas tienen la misma forma y Express no puede distinguirlas (los dos valores son numéricos). Por eso la consulta por SAC quedó en `/importaciones/sac/{sac}`.

Ejemplo de listado paginado:

```json
{
  "data": [
    {
      "id": 1,
      "correlativo": "32642260",
      "fecha_declaracion": "2023-08-30",
      "aduana": "Aduana Integrada Agua Caliente",
      "tipo_regimen": "ID Importación Definitiva",
      "tipo_cambio_dolar": 7.8715,
      "sac": "8504400000",
      "descripcion": "DISPOSITIVO SOLAR 03-62-1000-2-41-AT",
      "pais": "CHINA",
      "tipo_unidad_medida": "PIEZAS",
      "cantidad_fraccion": 1,
      "tasa_dai": 0,
      "valor_dai": 0,
      "valor_cif_uds": 670.78,
      "tasa_cif_cantidad_fraccion": 670.780029
    }
  ],
  "paginacion": { "page": 1, "limit": 20, "total": 20, "totalPages": 1 }
}
```

Errores:

| Código | Caso |
|---|---|
| 400 | `page`/`limit` inválidos, SAC con letras, correlativo con caracteres no permitidos |
| 404 | Póliza inexistente o ruta no encontrada |
| 500 | Error inesperado (el detalle solo se registra en la consola del servidor) |
