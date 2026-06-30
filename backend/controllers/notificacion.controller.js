const NotificacionModel = require('../models/notificacion.model');

const NotificacionController = {

  getByUsuario: async (req, res) => {
    try {
      const rows = await NotificacionModel.getByUsuario(req.usuario.id);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getNoLeidas: async (req, res) => {
    try {
      const total = await NotificacionModel.getNoLeidas(req.usuario.id);
      res.json({ total });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  marcarLeida: async (req, res) => {
    try {
      await NotificacionModel.marcarLeida(req.params.id);
      res.json({ mensaje: 'Notificación marcada como leída' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  marcarTodasLeidas: async (req, res) => {
    try {
      await NotificacionModel.marcarTodasLeidas(req.usuario.id);
      res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
};

module.exports = NotificacionController;