const express = require('express');
const importacionesRoutes = require('./routes/importacionesRoutes');
const estadisticasRoutes = require('./routes/estadisticasRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/importaciones', importacionesRoutes);
app.use('/estadisticas', estadisticasRoutes);

// Los middlewares de error van al final
app.use(notFound);
app.use(errorHandler);

module.exports = app;
