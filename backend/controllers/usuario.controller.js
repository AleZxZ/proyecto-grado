const UsuarioModel = require('../models/usuario.model');

const UsuarioController = {

  getAll: async (req, res) => {
    try {
      const rows = await UsuarioModel.getAll();
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  crear: async (req, res) => {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
      const emailExiste = await UsuarioModel.verificarEmailExiste(email);
      if (emailExiste) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }
      const result = await UsuarioModel.crear(req.body);
      res.status(201).json({ mensaje: 'Usuario creado correctamente', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  actualizar: async (req, res) => {
    try {
      await UsuarioModel.actualizar(req.params.id, req.body);
      res.json({ mensaje: 'Usuario actualizado correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
  getById: async (req, res) => {
    try {
      const usuario = await UsuarioModel.getById(req.params.id);
      if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(usuario);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};

module.exports = UsuarioController;