const AjustesModel = require('../models/ajustes.model');

const AjustesController = {

  getFechasBloqueadas: async (req, res) => {
    try {
      const sucursalId = req.usuario?.sucursal_id;
      if (!sucursalId) return res.status(400).json({ error: 'Usuario sin sucursal asignada' });

      const rows = await AjustesModel.getFechasBloqueadas(sucursalId);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  crearFechaBloqueada: async (req, res) => {
    const { fecha, motivo } = req.body;
    if (!fecha) return res.status(400).json({ error: 'La fecha es obligatoria' });

    try {
      const sucursalId = req.usuario?.sucursal_id;
      if (!sucursalId) return res.status(400).json({ error: 'Usuario sin sucursal asignada' });

      await AjustesModel.crearFechaBloqueada(sucursalId, fecha, motivo);
      res.status(201).json({ mensaje: 'Fecha bloqueada correctamente' });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Esa fecha ya está bloqueada' });
      }
      res.status(500).json({ error: e.message });
    }
  },

  eliminarFechaBloqueada: async (req, res) => {
    try {
      const sucursalId = req.usuario?.sucursal_id;
      await AjustesModel.eliminarFechaBloqueada(req.params.id, sucursalId);
      res.json({ mensaje: 'Fecha desbloqueada correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getTodasFechasBloqueadas: async (req, res) => {
    try {
      const rows = await AjustesModel.getTodasFechasBloqueadas();
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  crearRangoFechasBloqueadas: async (req, res) => {
        const { fecha_inicio, fecha_fin, motivo } = req.body;
        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({ error: 'Las fechas son obligatorias' });
        }
        if (fecha_fin < fecha_inicio) {
            return res.status(400).json({ error: 'La fecha final debe ser mayor a la inicial' });
        }

        try {
            const sucursalId = req.usuario?.sucursal_id;
            const total = await AjustesModel.crearRangoFechasBloqueadas(sucursalId, fecha_inicio, fecha_fin, motivo);
            res.status(201).json({ mensaje: `${total} fecha(s) bloqueada(s) correctamente` });
        } catch (e) { res.status(500).json({ error: e.message }); }
        },

        getFechasBloqueadasBySucursal: async (req, res) => {
        try {
            const rows = await AjustesModel.getFechasBloqueadasBySucursal(req.params.sucursalId);
            res.json(rows);
        } catch (e) { res.status(500).json({ error: e.message }); }
  },
};

module.exports = AjustesController;