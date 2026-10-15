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
