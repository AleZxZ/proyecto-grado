const jwt          = require('jsonwebtoken');
const bcrypt       = require('bcryptjs');
const UsuarioModel = require('../models/usuario.model');
const EmailService = require('../services/email.service');

const AuthController = {

  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    try {
      const usuario = await UsuarioModel.getByEmail(email);

      if (!usuario) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const passwordOk = await bcrypt.compare(password, usuario.password);
      if (!passwordOk) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      if (!usuario.activo) {
        return res.status(403).json({ error: 'Usuario inactivo' });
      }

      const token = jwt.sign(
        {
          id:          usuario.id,
          email:       usuario.email,
          rol:         usuario.rol,
          nombre:      usuario.nombre,
          sucursal_id: usuario.sucursal_id ?? null
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || '8h' }
      );

      res.json({
        token,
        usuario: {
          id:                    usuario.id,
          nombre:                usuario.nombre,
          apellido:              usuario.apellido,
          email:                 usuario.email,
          rol:                   usuario.rol,
          sucursal_id:           usuario.sucursal_id ?? null,
          debe_cambiar_password: usuario.debe_cambiar_password ?? 0,
        }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  verificar: async (req, res) => {
    res.json({ valido: true, usuario: req.usuario });
  },

  recuperarPassword: async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'El email es obligatorio' });

    try {
      const usuario = await UsuarioModel.getByEmail(email);
      if (!usuario)
        return res.status(404).json({ error: 'No existe una cuenta con ese correo' });

      // generar contraseña temporal de 8 caracteres
      const chars    = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      const tempPass = Array.from({ length: 8 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');

      await UsuarioModel.guardarPasswordTemporal(usuario.id, tempPass);
      await EmailService.enviarPasswordTemporal(usuario.email, usuario.nombre, tempPass);

      res.json({ mensaje: 'Correo de restablecimiento enviado correctamente' });
    } catch (e) {
      console.error('ERROR recuperar password:', e.message);
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = AuthController;