const express = require('express');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Los middlewares de error van al final
app.use(notFound);
app.use(errorHandler);

module.exports = app;
