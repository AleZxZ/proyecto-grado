const express            = require('express');
const router             = express.Router();
const PacienteController = require('../controllers/paciente.controller');

// ← rutas específicas primero
router.get('/',                       PacienteController.getTodos);
router.get('/detalle',                PacienteController.getTodosConDetalle);
router.get('/calendario/todos',       PacienteController.getCalendarioTodos);
router.get('/by-usuario/:usuarioId', PacienteController.getByUsuarioId);

// ← rutas con :id después
router.get('/:id/citas',              PacienteController.getCitas);
router.get('/:id/historial-clinico',  PacienteController.getHistorialClinico);
router.get('/:id/detalle',            PacienteController.getByIdConDetalle);
router.get('/:id/mis-citas',          PacienteController.getMisCitas);
router.get('/:id/mis-pagos',          PacienteController.getMisPagos);
router.get('/:id/mi-odontograma',     PacienteController.getMiOdontograma);

router.post('/',                      PacienteController.crear);
router.put('/:id',                    PacienteController.actualizar);

module.exports = router;