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
