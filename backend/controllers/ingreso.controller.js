const IngresoModel = require('../models/ingreso.model');

const IngresoController = {

  getIngresosMes: async (req, res) => {
    const mes      = parseInt(req.query.mes)      || new Date().getMonth() + 1;
    const anio     = parseInt(req.query.anio)     || new Date().getFullYear();
    const sucursal = parseInt(req.query.sucursal) || 0;

    try {
      const ingresos        = await IngresoModel.getIngresosMes(mes, anio, sucursal);
      const gastos          = await IngresoModel.getGastosMes(mes, anio, sucursal);
      const citasPendientes = await IngresoModel.getCitasPendientesMes(mes, anio);

      res.json({ ingresos, gastos, citasPendientes });
    } catch (e) { 
      console.error('ERROR ingresos:', e.message);
      res.status(500).json({ error: e.message }); 
    }
  },

  crearGasto: async (req, res) => {
    const { concepto, monto, categoria, fecha } = req.body;

    if (!concepto || !monto || !fecha) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (monto <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    try {
      await IngresoModel.crearGasto(req.body);
      res.status(201).json({ mensaje: 'Gasto registrado correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  eliminarGasto: async (req, res) => {
    try {
      await IngresoModel.eliminarGasto(req.params.id);
      res.json({ mensaje: 'Gasto eliminado correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getReportePeriodo: async (req, res) => {
    const { fecha_desde, fecha_hasta } = req.query;
    const sucursalId = req.usuario?.sucursal_id
      ? parseInt(req.usuario.sucursal_id) : null;

  // console.log('PARAMS reporte:', { fecha_desde, fecha_hasta, sucursalId }); // ← agregar

    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({ error: 'Las fechas son obligatorias' });
    }

    try {
      const data = await IngresoModel.getReportePeriodo(
        fecha_desde,
        fecha_hasta + ' 23:59:59',
        sucursalId
      );
      res.json(data);
    } catch (e) {
      //console.error('ERROR reporte ingresos:', e.message); // ← agregar
      //console.error('ERROR stack:', e.stack);              // ← agregar
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = IngresoController;