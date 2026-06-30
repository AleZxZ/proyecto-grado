const express            = require('express');
const router             = express.Router();
const UsuarioController  = require('../controllers/usuario.controller');

router.get('/',     UsuarioController.getAll);
router.post('/',    UsuarioController.crear);
router.put('/:id',  UsuarioController.actualizar);
router.get('/:id',  UsuarioController.getById);

module.exports = router;