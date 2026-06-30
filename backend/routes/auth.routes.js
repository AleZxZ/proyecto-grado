const express        = require('express');
const router         = express.Router();
const AuthController = require('../controllers/auth.controller');
const { verificarJWT } = require('../middlewares/auth.middleware');

router.post('/login',    AuthController.login);
router.get('/verificar', verificarJWT, AuthController.verificar);
router.post('/recuperar-password', AuthController.recuperarPassword);

module.exports = router;