const express                  = require('express');
const router                   = express.Router();
const NotificacionController   = require('../controllers/notificacion.controller');

router.get('/',            NotificacionController.getByUsuario);
router.get('/no-leidas',   NotificacionController.getNoLeidas);
router.put('/:id/leer',    NotificacionController.marcarLeida);
router.put('/leer-todas',  NotificacionController.marcarTodasLeidas);

module.exports = router;