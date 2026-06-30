const PagoModel = require('../models/pago.model');

const PagoController = {

  getResumenPorPaciente: async (req, res) => {
    try {
      const sucursalId = req.query.sucursal_id
        ? parseInt(req.query.sucursal_id) : null;
      const rows = await PagoModel.getResumenPorPaciente(sucursalId);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getByPaciente: async (req, res) => {
    try {
      const rows = await PagoModel.getByPaciente(req.params.pacienteId);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getHistorialAbonos: async (req, res) => {
    try {
      const rows = await PagoModel.getHistorialAbonos(req.params.pacienteId);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getStatsGlobales: async (req, res) => {
    try {
      const sucursalId = req.query.sucursal_id
        ? parseInt(req.query.sucursal_id) : null;
      const stats = await PagoModel.getStatsGlobales(sucursalId);
      res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  crear: async (req, res) => {
    const { paciente_id, concepto, monto_total, monto_pagado, notas } = req.body;

    if (!paciente_id || !concepto || !monto_total) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (monto_total <= 0) {
      return res.status(400).json({ error: 'El monto total debe ser mayor a 0' });
    }

    try {
      const result = await PagoModel.crear(req.body);
      res.status(201).json({ mensaje: 'Pago registrado correctamente', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  abonar: async (req, res) => {
    const { monto, notas } = req.body;
    const pacienteId       = req.params.pacienteId;
    
    // obtener sucursal del token, si es null usar 1 por defecto
    const sucursalId = req.usuario?.sucursal_id 
      ? parseInt(req.usuario.sucursal_id) 
      : 1;

    console.log('sucursalId final:', sucursalId);

    if (!monto || monto <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    try {
      const abonoId = await PagoModel.aplicarAbonoFIFO(
        pacienteId, monto, notas, sucursalId
      );
      if (!abonoId) {
        return res.status(404).json({ error: 'No hay pagos pendientes' });
      }
      res.json({ mensaje: 'Abono registrado correctamente', abono_id: abonoId });
    } catch (e) { 
      console.error('ERROR abonar:', e.message);
      res.status(500).json({ error: e.message }); 
    }
  },

  eliminar: async (req, res) => {
    try {
      await PagoModel.eliminar(req.params.id);
      res.json({ mensaje: 'Pago eliminado correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
};

module.exports = PagoController;