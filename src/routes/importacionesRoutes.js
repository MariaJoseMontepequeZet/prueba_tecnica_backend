const { Router } = require('express');
const controller = require('../controllers/importacionesController');

const router = Router();

router.get('/', controller.listar);
// /sac/:sac va antes de /:correlativo para que "sac" no se tome como un correlativo
router.get('/sac/:sac', controller.listarPorSac);
router.get('/:correlativo', controller.obtenerPorCorrelativo);

module.exports = router;
