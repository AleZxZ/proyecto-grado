const express            = require('express');
const router             = express.Router();
const AjustesController  = require('../controllers/ajustes.controller');

router.get('/fechas-bloqueadas',           AjustesController.getFechasBloqueadas);
router.get('/fechas-bloqueadas/sucursal/:sucursalId', AjustesController.getFechasBloqueadasBySucursal);
router.get('/fechas-bloqueadas-todas',     AjustesController.getTodasFechasBloqueadas);
router.post('/fechas-bloqueadas',          AjustesController.crearFechaBloqueada);
router.post('/fechas-bloqueadas-rango',           AjustesController.crearRangoFechasBloqueadas);
router.delete('/fechas-bloqueadas/:id',    AjustesController.eliminarFechaBloqueada);

module.exports = router;