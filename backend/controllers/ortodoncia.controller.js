const OrtodonciaModel = require('../models/ortodoncia.model');
const PagoModel       = require('../models/pago.model');
const PacienteModel   = require('../models/paciente.model');

const OrtodonciaController = {

  getPlanActivo: async (req, res) => {
    try {
      const plan = await OrtodonciaModel.getPlanActivo(req.params.pacienteId);
      if (!plan) return res.json(null);
      const sesiones = await OrtodonciaModel.getSesiones(plan.id);
      const pagos    = await OrtodonciaModel.getTotalPagado(plan.id);
      res.json({ plan, sesiones, pagos });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  crearPlan: async (req, res) => {
    try {
      const { paciente_id, tipo_bracket, precio_total,
              cuota_inicial, observaciones } = req.body;

      if (!paciente_id || !tipo_bracket || !precio_total) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      const planExiste = await OrtodonciaModel.getPlanActivo(paciente_id);
      if (planExiste) {
        return res.status(409).json({ error: 'El paciente ya tiene un plan activo' });
      }

      const result = await OrtodonciaModel.crearPlan({
        paciente_id, tipo_bracket, precio_total,
        cuota_inicial, observaciones
      });

      // ← registrar cuota inicial en abonos si es mayor a 0
      if (cuota_inicial && cuota_inicial > 0) {
        const paciente = await PacienteModel.getByIdConDetalle(paciente_id);
        const sucursal_id = paciente?.sucursal_pref ?? 1;

        await PagoModel.crearAbonoDirecto(
          paciente_id,
          sucursal_id,
          cuota_inicial,
          `Cuota inicial ortodoncia — ${tipo_bracket}`
        );
      }

      res.status(201).json({ mensaje: 'Plan creado correctamente', id: result.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  crearSesion: async (req, res) => {
    try {
      const { plan_id, dientes_sesion, observaciones, cuota_pagada, paciente_id } = req.body;

      if (!plan_id) {
        return res.status(400).json({ error: 'Falta el plan_id' });
      }

      await OrtodonciaModel.crearSesion({
        plan_id, dientes_sesion, observaciones, cuota_pagada
      });

      // ← registrar cuota de sesión en abonos si es mayor a 0
      if (cuota_pagada && cuota_pagada > 0 && paciente_id) {
        const paciente = await PacienteModel.getByIdConDetalle(paciente_id);
        const sucursal_id = paciente?.sucursal_pref ?? 1;

        await PagoModel.crearAbonoDirecto(
          paciente_id,
          sucursal_id,
          cuota_pagada,
          `Pago sesión ortodoncia`
        );
      }

      res.status(201).json({ mensaje: 'Sesión registrada correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  finalizarPlan: async (req, res) => {
    try {
      await OrtodonciaModel.finalizarPlan(req.params.planId);
      res.json({ mensaje: 'Plan finalizado correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },


};

module.exports = OrtodonciaController;