const express        = require('express');
const router         = express.Router();
const PagoController = require('../controllers/pago.controller');

router.get('/stats',                        PagoController.getStatsGlobales);
router.get('/resumen',                      PagoController.getResumenPorPaciente);
router.get('/paciente/:pacienteId',         PagoController.getByPaciente);
router.get('/paciente/:pacienteId/abonos',  PagoController.getHistorialAbonos);
router.post('/',                            PagoController.crear);
router.post('/paciente/:pacienteId/abonar', PagoController.abonar);
router.delete('/:id',                       PagoController.eliminar);

module.exports = router;