const db = require('../config/db');

const PacienteModel = {

  getTodos: async () => {
    const [rows] = await db.query(`
      SELECT p.id, CONCAT(u.nombre, ' ', u.apellido) AS nombre,
             s.nombre AS sucursal, s.id AS sucursal_id
      FROM pacientes p
      JOIN sucursales s ON s.id = p.sucursal_pref
      JOIN usuarios   u ON u.id = p.usuario_id
      ORDER BY u.nombre
    `);
    return rows;
  },

  getCitasRealizadas: async (pacienteId) => {
    const [rows] = await db.query(`
      SELECT c.fecha, c.hora, c.motivo, c.estado,
             t.nombre  AS tratamiento,
             st.nombre AS subtratamiento,
             st.intervalo_dias,
             s.id      AS sucursal_id,
             s.nombre  AS sucursal_nombre,
             CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre
      FROM citas c
      JOIN tratamientos    t  ON t.id  = c.tratamiento_id
      JOIN subtratamientos st ON st.id = c.subtratamiento_id
      JOIN sucursales      s  ON s.id  = c.sucursal_id
      JOIN pacientes       p  ON p.id  = c.paciente_id
      JOIN usuarios        u  ON u.id  = p.usuario_id
      WHERE c.paciente_id = ? AND c.estado = 'realizada'
      ORDER BY c.fecha ASC
    `, [pacienteId]);
    return rows;
  },

  getHistorialParaPrediccion: async (pacienteId) => {
    const [rows] = await db.query(`
      SELECT c.fecha, c.hora, c.motivo,
             t.nombre  AS tratamiento,
             st.nombre AS subtratamiento,
             st.intervalo_dias,
             s.id      AS sucursal_id,
             s.nombre  AS sucursal_nombre,
             CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre
      FROM citas c
      JOIN tratamientos    t  ON t.id  = c.tratamiento_id
      JOIN subtratamientos st ON st.id = c.subtratamiento_id
      JOIN sucursales      s  ON s.id  = c.sucursal_id
      JOIN pacientes       p  ON p.id  = c.paciente_id
      JOIN usuarios        u  ON u.id  = p.usuario_id
      WHERE c.paciente_id = ? AND c.estado = 'realizada'
      ORDER BY c.fecha ASC
    `, [pacienteId]);
    return rows;
  },

  getCitasPendientes: async (hoy) => {
    const [rows] = await db.query(`
      SELECT
        c.id, c.fecha, c.hora, c.motivo, c.notas,
        c.paciente_id,
        CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre,
        t.nombre  AS tratamiento,
        st.nombre AS subtratamiento,
        s.id      AS sucursal_id,
        s.nombre  AS sucursal_nombre
      FROM citas c
      JOIN pacientes       p  ON p.id  = c.paciente_id
      JOIN usuarios        u  ON u.id  = p.usuario_id
      JOIN tratamientos    t  ON t.id  = c.tratamiento_id
      JOIN subtratamientos st ON st.id = c.subtratamiento_id
      JOIN sucursales      s  ON s.id  = c.sucursal_id
      WHERE c.estado = 'pendiente'
        AND c.fecha >= ?
      ORDER BY c.fecha ASC, c.hora ASC
    `, [hoy]);
    return rows;
  },

  crear: async (datos) => {
    const { fecha_nac, telefono, direccion,
            genero, sucursal_pref, usuario_id } = datos;
    const [result] = await db.query(`
      INSERT INTO pacientes
        (fecha_nac, telefono, direccion, genero, sucursal_pref, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [fecha_nac, telefono, direccion, genero, sucursal_pref, usuario_id]);
    return result;
  },

  getTodosConDetalle: async () => {
    const [rows] = await db.query(`
      SELECT p.id, u.nombre, u.apellido, p.telefono,
            u.celular,
            p.fecha_nac, p.genero, p.direccion,
            s.nombre AS sucursal,
            u.email  AS email_acceso,
            u.activo
      FROM pacientes p
      LEFT JOIN sucursales s ON s.id = p.sucursal_pref
      LEFT JOIN usuarios   u ON u.id = p.usuario_id
      ORDER BY u.nombre
    `);
    return rows;
  },

  getByIdConDetalle: async (id) => {
    const [rows] = await db.query(`
      SELECT p.*, s.nombre AS sucursal,
             u.email AS email_acceso, u.rol, u.activo,
             u.nombre, u.apellido,u.celular 
      FROM pacientes p
      LEFT JOIN sucursales s ON s.id = p.sucursal_pref
      LEFT JOIN usuarios   u ON u.id = p.usuario_id
      WHERE p.id = ?
    `, [id]);
    return rows[0];
  },

  actualizar: async (id, datos) => {
    const { fecha_nac, telefono, direccion,
            genero, sucursal_pref } = datos;
    await db.query(`
      UPDATE pacientes SET
        fecha_nac     = ?,
        telefono      = ?,
        direccion     = ?,
        genero        = ?,
        sucursal_pref = ?
      WHERE id = ?
    `, [fecha_nac, telefono, direccion, genero, sucursal_pref, id]);
  },

  getHistorialClinico: async (pacienteId) => {
    const [rows] = await db.query(`
      SELECT * FROM historial_clinico
      WHERE paciente_id = ?
    `, [pacienteId]);
    return rows[0] ?? null;
  },

  //Para paciente
  getMisCitas: async (pacienteId) => {
    const [rows] = await db.query(`
      SELECT c.id, c.fecha, c.hora, c.motivo, c.estado, c.notas,
            t.nombre  AS tratamiento,
            st.nombre AS subtratamiento,
            s.nombre  AS sucursal_nombre,
            s.id      AS sucursal_id
      FROM citas c
      LEFT JOIN tratamientos    t  ON t.id  = c.tratamiento_id
      LEFT JOIN subtratamientos st ON st.id = c.subtratamiento_id
      JOIN sucursales           s  ON s.id  = c.sucursal_id
      WHERE c.paciente_id = ?
      ORDER BY c.fecha DESC, c.hora DESC
    `, [pacienteId]);
    return rows;
  },

  getMisPagos: async (pacienteId) => {
   
    const [pendientes] = await db.query(`
      SELECT pg.*,
            pg.monto_total - pg.monto_pagado AS saldo,
            COALESCE(o.fecha, pg.creado_en)  AS fecha_tratamiento
      FROM pagos pg
      LEFT JOIN odontograma o ON o.id = pg.odontograma_id
      WHERE pg.paciente_id = ?
      ORDER BY pg.creado_en DESC
    `, [pacienteId]);

    // historial de abonos
    const [abonos] = await db.query(`
      SELECT a.id, a.monto, a.notas, a.creado_en,
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'pago_id',  ad.pago_id,
                'monto',    ad.monto,
                'concepto', pg.concepto
              )
            ) AS detalle
      FROM abonos a
      JOIN abono_detalle ad ON ad.abono_id = a.id
      JOIN pagos pg         ON pg.id = ad.pago_id
      WHERE a.paciente_id = ?
      GROUP BY a.id
      ORDER BY a.creado_en DESC
    `, [pacienteId]);

    // plan de ortodoncia
    const [ortodoncia] = await db.query(`
      SELECT op.id, op.tipo_bracket, op.precio_total,
            op.cuota_inicial, op.estado, op.creado_en,
            COALESCE(SUM(os.cuota_pagada), 0) AS pagado_sesiones,
            (op.precio_total - op.cuota_inicial - COALESCE(SUM(os.cuota_pagada), 0)) AS saldo_pendiente
      FROM ortodoncia_plan op
      LEFT JOIN ortodoncia_sesiones os ON os.plan_id = op.id
      WHERE op.paciente_id = ?
      GROUP BY op.id
      ORDER BY op.creado_en DESC
    `, [pacienteId]);

    // sesiones de ortodoncia
    const [sesiones] = await db.query(`
      SELECT os.*
      FROM ortodoncia_sesiones os
      JOIN ortodoncia_plan op ON op.id = os.plan_id
      WHERE op.paciente_id = ?
      ORDER BY os.fecha_sesion DESC
    `, [pacienteId]);

    return { pendientes, abonos, ortodoncia, sesiones };
  },

  getMiOdontograma: async (pacienteId) => {
    const [rows] = await db.query(`
      SELECT o.*, t.nombre AS tratamiento,
            st.nombre AS subtratamiento
      FROM odontograma o
      LEFT JOIN tratamientos    t  ON t.id  = o.tratamiento_id
      LEFT JOIN subtratamientos st ON st.id = o.subtratamiento_id
      WHERE o.paciente_id = ? AND o.activo = 1
    `, [pacienteId]);
    return rows;
  },
  getByUsuarioId: async (usuarioId) => {
    const [rows] = await db.query(`
      SELECT id FROM pacientes WHERE usuario_id = ?
    `, [usuarioId]);
    return rows[0] ?? null;
  },
};

module.exports = PacienteModel;