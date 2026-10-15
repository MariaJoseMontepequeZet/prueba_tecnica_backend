const { Router } = require('express');
const controller = require('../controllers/estadisticasController');

const router = Router();

router.get('/por-pais', controller.porPais);
router.get('/por-aduana', controller.porAduana);

module.exports = router;
