const db = require('../config/db');

const OrtodonciaModel = {

  getPlanActivo: async (pacienteId) => {
    const [rows] = await db.query(`
      SELECT op.*,
             COALESCE(SUM(os.cuota_pagada), 0) AS total_pagado,
             op.precio_total - op.cuota_inicial - COALESCE(SUM(os.cuota_pagada), 0) AS saldo_actual
      FROM ortodoncia_plan op
      LEFT JOIN ortodoncia_sesiones os ON os.plan_id = op.id
      WHERE op.paciente_id = ? AND op.estado = 'activo'
      GROUP BY op.id
      ORDER BY op.creado_en DESC
      LIMIT 1
    `, [pacienteId]);
    return rows[0];
  },


  getSesiones: async (planId) => {
    const [rows] = await db.query(`
      SELECT * FROM ortodoncia_sesiones
      WHERE plan_id = ?
      ORDER BY creado_en DESC
    `, [planId]);
    return rows;
  },

  crearPlan: async (datos) => {
    const { paciente_id, tipo_bracket, precio_total,
            cuota_inicial, observaciones } = datos;
    const [result] = await db.query(`
      INSERT INTO ortodoncia_plan
        (paciente_id, tipo_bracket, precio_total, cuota_inicial, observaciones)
      VALUES (?, ?, ?, ?, ?)
    `, [paciente_id, tipo_bracket, precio_total,
        cuota_inicial || 0, observaciones || null]);
    return result;
  },

  crearSesion: async (datos) => {
    const { plan_id, dientes_sesion, observaciones, cuota_pagada } = datos;
    const [result] = await db.query(`
      INSERT INTO ortodoncia_sesiones
        (plan_id, dientes_sesion, observaciones, cuota_pagada)
      VALUES (?, ?, ?, ?)
    `, [plan_id, JSON.stringify(dientes_sesion),
        observaciones || null, cuota_pagada || 0]);
    return result;
  },

  finalizarPlan: async (planId) => {
    await db.query(
      "UPDATE ortodoncia_plan SET estado = 'finalizado' WHERE id = ?",
      [planId]
    );
  },

  getTotalPagado: async (planId) => {
    const [rows] = await db.query(`
      SELECT op.cuota_inicial,
             op.precio_total,
             COALESCE(SUM(os.cuota_pagada), 0) AS pagado_sesiones
      FROM ortodoncia_plan op
      LEFT JOIN ortodoncia_sesiones os ON os.plan_id = op.id
      WHERE op.id = ?
      GROUP BY op.id
    `, [planId]);
    return rows[0];
  }
};

module.exports = OrtodonciaModel;