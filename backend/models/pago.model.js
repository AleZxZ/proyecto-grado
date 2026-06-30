const db = require('../config/db');

const PagoModel = {

  getStatsGlobales: async (sucursalId) => {
    const whereSucursal = sucursalId ? 'AND p.sucursal_pref = ?' : '';
    const paramsPagos   = sucursalId ? [sucursalId] : [];

    const [rows] = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN pg.estado = 'pendiente'
          THEN pg.monto_total - pg.monto_pagado ELSE 0 END), 0) AS deuda_total,
        COUNT(CASE WHEN pg.estado = 'pendiente' THEN 1 END) AS count_pendientes
      FROM pagos pg
      JOIN pacientes p ON p.id = pg.paciente_id
      WHERE 1=1 ${whereSucursal}
    `, paramsPagos);

    const whereAbonos  = sucursalId ? 'AND sucursal_id = ?' : '';
    const paramsAbonos = sucursalId ? [sucursalId] : [];

    const [abonos] = await db.query(`
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM abonos
      WHERE YEARWEEK(creado_en, 1) = YEARWEEK(NOW(), 1)
      ${whereAbonos}
    `, paramsAbonos);

    return {
      deuda_total:          rows[0].deuda_total,
      count_pendientes:     rows[0].count_pendientes,
      total_cobrado_semana: Number(abonos[0].total)
    };
  },

  getResumenPorPaciente: async (sucursalId) => {
    const whereSucursal = sucursalId ? 'AND p.sucursal_pref = ?' : '';
    const params        = sucursalId ? [sucursalId] : [];

    const [rows] = await db.query(`
      SELECT
        p.id AS paciente_id,
        CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre,
        COUNT(pg.id) AS total_tratamientos,
        COALESCE(SUM(pg.monto_total), 0) AS monto_total,
        COALESCE(SUM(pg.monto_pagado), 0) AS monto_pagado,
        COALESCE(SUM(pg.monto_total - pg.monto_pagado), 0) AS deuda_total
      FROM pacientes p
      JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN pagos pg ON pg.paciente_id = p.id AND pg.estado = 'pendiente'
      WHERE 1=1 ${whereSucursal}
      GROUP BY p.id, u.nombre, u.apellido
      HAVING deuda_total > 0
      ORDER BY deuda_total DESC
    `, params);
    return rows;
  },

  getByPaciente: async (pacienteId) => {
    const [rows] = await db.query(`
      SELECT pg.*,
             pg.monto_total - pg.monto_pagado AS saldo,
             COALESCE(o.fecha, pg.creado_en)  AS fecha_tratamiento
      FROM pagos pg
      LEFT JOIN odontograma o ON o.id = pg.odontograma_id
      WHERE pg.paciente_id = ?
      AND (
        pg.estado = 'pendiente'
        OR EXISTS (
          SELECT 1 FROM abono_detalle ad WHERE ad.pago_id = pg.id
        )
      )
      ORDER BY pg.creado_en ASC
    `, [pacienteId]);
    return rows;
  },

  getHistorialAbonos: async (pacienteId) => {
    const [rows] = await db.query(`
      SELECT a.id, a.monto, a.notas, a.creado_en,
             JSON_ARRAYAGG(
               JSON_OBJECT(
                 'pago_id',        ad.pago_id,
                 'monto',          ad.monto,
                 'concepto',       pg.concepto,
                 'tratamiento',    t.nombre,
                 'subtratamiento', st.nombre
               )
             ) AS detalle
      FROM abonos a
      JOIN abono_detalle ad ON ad.abono_id = a.id
      JOIN pagos pg         ON pg.id = ad.pago_id
      LEFT JOIN odontograma    o  ON o.id  = pg.odontograma_id
      LEFT JOIN tratamientos   t  ON t.id  = o.tratamiento_id
      LEFT JOIN subtratamientos st ON st.id = o.subtratamiento_id
      WHERE a.paciente_id = ?
      GROUP BY a.id
      ORDER BY a.creado_en DESC
    `, [pacienteId]);
    return rows;
  },

  crear: async (datos) => {
    const { paciente_id, odontograma_id, concepto,
            monto_total, monto_pagado, notas } = datos;

    const estado     = monto_pagado >= monto_total ? 'cancelado' : 'pendiente';
    const fecha_pago = estado === 'cancelado'
      ? new Date().toISOString().split('T')[0] : null;

    const [result] = await db.query(`
      INSERT INTO pagos
        (paciente_id, odontograma_id, concepto,
         monto_total, monto_pagado, estado, fecha_pago, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [paciente_id, odontograma_id || null, concepto,
        monto_total, monto_pagado || 0, estado, fecha_pago, notas || null]);
    return result;
  },

  aplicarAbonoFIFO: async (pacienteId, montoAbono, notas, sucursalId) => {
    const [pendientes] = await db.query(`
      SELECT * FROM pagos
      WHERE paciente_id = ? AND estado = 'pendiente'
      ORDER BY creado_en ASC
    `, [pacienteId]);

    if (!pendientes.length) return null;

    const [abonoResult] = await db.query(`
      INSERT INTO abonos (paciente_id, sucursal_id, monto, notas)
      VALUES (?, ?, ?, ?)
    `, [pacienteId, sucursalId, montoAbono, notas || null]);

    const abonoId  = abonoResult.insertId;
    let   restante = montoAbono;

    for (const pago of pendientes) {
      if (restante <= 0) break;

      const saldo            = pago.monto_total - pago.monto_pagado;
      const abonoAPago       = Math.min(restante, saldo);
      const nuevoMontoPagado = pago.monto_pagado + abonoAPago;
      const nuevoEstado      = nuevoMontoPagado >= pago.monto_total
        ? 'cancelado' : 'pendiente';
      const fechaPago        = nuevoEstado === 'cancelado'
        ? new Date().toISOString().split('T')[0] : null;

      await db.query(`
        UPDATE pagos SET
          monto_pagado = ?,
          estado       = ?,
          fecha_pago   = ?
        WHERE id = ?
      `, [nuevoMontoPagado, nuevoEstado, fechaPago, pago.id]);

      await db.query(`
        INSERT INTO abono_detalle (abono_id, pago_id, monto)
        VALUES (?, ?, ?)
      `, [abonoId, pago.id, abonoAPago]);

      restante -= abonoAPago;
    }

    return abonoId;
  },

  eliminar: async (id) => {
    await db.query('DELETE FROM pagos WHERE id = ?', [id]);
  },

  crearAbonoDirecto: async (pacienteId, sucursalId, monto, notas) => {
    const [result] = await db.query(`
      INSERT INTO abonos (paciente_id, sucursal_id, monto, notas)
      VALUES (?, ?, ?, ?)
    `, [pacienteId, sucursalId || 1, monto, notas || null]);
    return result;
  },
};

module.exports = PagoModel;