const express           = require('express');
const router            = express.Router();
const CitaController    = require('../controllers/cita.controller');

router.post('/confirmar',               CitaController.confirmar);
router.get('/pendientes',               CitaController.getPendientes);
router.get('/tratamientos/:sucursalId', CitaController.getTratamientos);
router.get('/doctores/:sucursalId',     CitaController.getDoctores);
router.get('/calendario-publico', CitaController.getCalendarioPublico);
router.get('/solicitudes',          CitaController.getSolicitudesPendientes);
router.get('/hoy',                  CitaController.getCitasHoy);
router.get('/pendientes-asignar',  CitaController.getPendientesAsignar);
router.get('/atendidos-hoy', CitaController.getPacientesAtendidosHoy);
router.post('/',                        CitaController.crear);  
router.put('/:id/confirmar',        CitaController.confirmarSolicitud);
router.put('/:id/asignar-tratamiento', CitaController.asignarTratamiento);
router.put('/:id/rechazar',         CitaController.rechazarSolicitud);
router.put('/:id/estado', CitaController.cambiarEstado);
router.delete('/:id',                   CitaController.eliminar);

module.exports = router;