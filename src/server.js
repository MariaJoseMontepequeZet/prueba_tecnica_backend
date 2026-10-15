const app = require('./app');
const { port } = require('./config/env');

// Punto de entrada: levanta el servidor HTTP
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
