const OdontogramaModel = require('../models/odontograma.model');
const PagoModel        = require('../models/pago.model');

const OdontogramaController = {

  getByPaciente: async (req, res) => {
    try {
      const datos = await OdontogramaModel.getByPaciente(req.params.pacienteId);
      res.json(datos);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getHistorialCara: async (req, res) => {
    try {
      const { pacienteId, diente, cara } = req.params;
      const historial = await OdontogramaModel.getHistorialCara(pacienteId, diente, cara);
      res.json(historial);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  guardarCara: async (req, res) => {
    try {
      const { estado, tratamiento_id, subtratamiento_id,
              notas, diente, cara,
              monto_total, monto_pagado,
              concepto_pago } = req.body;
      const pacienteId = req.params.pacienteId;
      
      // ← tomar sucursal del token
      const sucursalId = req.usuario?.sucursal_id
        ? parseInt(req.usuario.sucursal_id)
        : 1;

      let odontogramaId = null;

      if (['extraccion','corona','sellante'].includes(estado)) {
        odontogramaId = await OdontogramaModel.guardarDienteCompleto(
          pacienteId, diente, estado,
          tratamiento_id, subtratamiento_id, notas
        ); 
      } else {
        const result = await OdontogramaModel.guardarCara({
          paciente_id: pacienteId,
          diente, cara, estado,
          tratamiento_id, subtratamiento_id, notas,
          tipo: 'cara'
        });
        odontogramaId = result.insertId;
      }

      // crear pago si se ingresó monto
      if (monto_total && monto_total > 0 && monto_pagado > 0) {
        const pagoResult = await PagoModel.crear({
          paciente_id:    pacienteId,
          odontograma_id: odontogramaId,
          concepto:       concepto_pago || `Diente ${diente} - ${estado}`,
          monto_total,
          monto_pagado,
          notas:          null
        });

        // ← usar sucursalId del token en lugar de 1 fijo
        await PagoModel.crearAbonoDirecto(
          pacienteId,
          sucursalId,  // ← corregido
          monto_pagado,
          `Diente ${diente} - ${estado}`
        );
      }

      res.json({ mensaje: 'Guardado correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
  getHistorialCompleto: async (req, res) => {
    try {
      const rows = await OdontogramaModel.getHistorialCompleto(req.params.pacienteId);
      res.json(rows);
    } catch (e) { 
      console.error('ERROR getHistorialCompleto:', e.message);
      res.status(500).json({ error: e.message }); 
    }
  },
  editarRegistro: async (req, res) => {
    try {
      await OdontogramaModel.editarRegistro(req.params.id, req.body);
      res.json({ mensaje: 'Registro actualizado correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
  eliminarRegistro: async (req, res) => {
    try {
      await OdontogramaModel.eliminarRegistro(req.params.id);
      res.json({ mensaje: 'Registro eliminado correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};

module.exports = OdontogramaController;