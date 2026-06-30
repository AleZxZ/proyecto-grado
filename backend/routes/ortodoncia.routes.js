const express              = require('express');
const router               = express.Router();
const OrtodonciaController = require('../controllers/ortodoncia.controller');

router.get('/:pacienteId/plan',      OrtodonciaController.getPlanActivo);
router.post('/plan',                 OrtodonciaController.crearPlan);
router.post('/sesion',               OrtodonciaController.crearSesion);
router.put('/plan/:planId/finalizar', OrtodonciaController.finalizarPlan);

module.exports = router;