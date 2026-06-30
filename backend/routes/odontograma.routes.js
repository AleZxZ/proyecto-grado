const express               = require('express');
const router                = express.Router();
const OdontogramaController = require('../controllers/odontograma.controller');

router.get('/:pacienteId/historial/completo',      OdontogramaController.getHistorialCompleto);
router.get('/:pacienteId/:diente/:cara/historial', OdontogramaController.getHistorialCara);
router.get('/:pacienteId',                         OdontogramaController.getByPaciente);
router.post('/:pacienteId',                        OdontogramaController.guardarCara);
router.put('/registro/:id', OdontogramaController.editarRegistro);
router.delete('/:pacienteId/registro/:id', OdontogramaController.eliminarRegistro);


module.exports = router;