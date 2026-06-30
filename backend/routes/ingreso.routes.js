const express           = require('express');
const router            = express.Router();
const IngresoController = require('../controllers/ingreso.controller');

router.get('/',             IngresoController.getIngresosMes);
router.post('/gastos',      IngresoController.crearGasto);
router.delete('/gastos/:id', IngresoController.eliminarGasto);
router.get('/reporte', IngresoController.getReportePeriodo);

module.exports = router;