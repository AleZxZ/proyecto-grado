const express            = require('express');
const router             = express.Router();
const ReporteController  = require('../controllers/reporte.controller');

router.get('/', ReporteController.getEstadisticas);

module.exports = router;