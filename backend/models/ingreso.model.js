const db = require('../config/db');

const IngresoModel = {

  getIngresosMes: async (mes, anio, sucursalId) => {
    const whereSucursal = sucursalId > 0 ? 'AND a.sucursal_id = ?' : '';
    const params        = sucursalId > 0
      ? [mes, anio, sucursalId]
      : [mes, anio];

    const [ingresos] = await db.query(`
      SELECT a.id, a.monto, a.notas, a.creado_en,
             a.sucursal_id, s.nombre AS sucursal_nombre,
             CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre
      FROM abonos a
      JOIN pacientes  p ON p.id = a.paciente_id
      JOIN usuarios   u ON u.id = p.usuario_id
      JOIN sucursales s ON s.id = a.sucursal_id
      WHERE MONTH(a.creado_en) = ?
        AND YEAR(a.creado_en)  = ?
        ${whereSucursal}
      ORDER BY a.creado_en DESC
    `, params);

    return ingresos;
  },

  getGastosMes: async (mes, anio, sucursalId) => {
    const whereSucursal = sucursalId > 0 ? 'AND sucursal_id = ?' : '';
    const params        = sucursalId > 0
      ? [mes, anio, sucursalId]
      : [mes, anio];

    const [rows] = await db.query(`
      SELECT * FROM gastos
      WHERE MONTH(fecha) = ? AND YEAR(fecha) = ?
      ${whereSucursal}
      ORDER BY fecha DESC
    `, params);
    return rows;
  },

  getCitasPendientesMes: async (mes, anio) => {
    const [rows] = await db.query(`
      SELECT pg.monto_total,
             pg.monto_pagado,
             pg.monto_total - pg.monto_pagado AS monto_pendiente,
             pg.concepto,
             CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre
      FROM pagos pg
      JOIN pacientes p ON p.id = pg.paciente_id
      JOIN usuarios  u ON u.id = p.usuario_id
      WHERE pg.estado = 'pendiente'
    `);
    return rows;
  },

  crearGasto: async (datos) => {
    const { concepto, monto, categoria, sucursal_id, fecha, notas } = datos;
    const [result] = await db.query(`
      INSERT INTO gastos (concepto, monto, categoria, sucursal_id, fecha, notas)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [concepto, monto, categoria, sucursal_id || 1, fecha, notas || null]);
    return result;
  },

  eliminarGasto: async (id) => {
    await db.query('DELETE FROM gastos WHERE id = ?', [id]);
  },

  getReportePeriodo: async (fechaDesde, fechaHasta, sucursalId) => {
    const whereSucursalAbonos  = sucursalId ? 'AND a.sucursal_id = ?' : '';
    const whereSucursalGastos  = sucursalId ? 'AND sucursal_id = ?' : '';
    const whereSucursalAntAbonos = sucursalId ? 'AND sucursal_id = ?' : '';
    const whereSucursalAntGastos = sucursalId ? 'AND sucursal_id = ?' : '';

    const paramsIngresos = sucursalId
      ? [fechaDesde, fechaHasta, sucursalId]
      : [fechaDesde, fechaHasta];

    const [ingresos] = await db.query(`
      SELECT a.id, a.monto, a.notas, a.creado_en,
            a.sucursal_id, s.nombre AS sucursal_nombre,
            CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre
      FROM abonos a
      JOIN pacientes  p ON p.id = a.paciente_id
      JOIN usuarios   u ON u.id = p.usuario_id
      JOIN sucursales s ON s.id = a.sucursal_id
      WHERE a.creado_en BETWEEN ? AND ?
      ${whereSucursalAbonos}
      ORDER BY a.creado_en ASC
    `, paramsIngresos);

    const paramsGastos = sucursalId
      ? [fechaDesde, fechaHasta, sucursalId]
      : [fechaDesde, fechaHasta];

    const [gastos] = await db.query(`
      SELECT * FROM gastos
      WHERE fecha BETWEEN ? AND ?
      ${whereSucursalGastos}
      ORDER BY fecha ASC
    `, paramsGastos);

    // período anterior
    const dias = Math.ceil(
      (new Date(fechaHasta) - new Date(fechaDesde)) / (1000 * 60 * 60 * 24)
    );
    const fechaAntDesde = new Date(new Date(fechaDesde) - dias * 86400000)
      .toISOString().split('T')[0];
    const fechaAntHasta = new Date(new Date(fechaDesde) - 86400000)
      .toISOString().split('T')[0];

    const paramsAntAbonos = sucursalId
      ? [fechaAntDesde, fechaAntHasta, sucursalId]
      : [fechaAntDesde, fechaAntHasta];

    const [ingresosAnt] = await db.query(`
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM abonos
      WHERE creado_en BETWEEN ? AND ?
      ${whereSucursalAntAbonos}
    `, paramsAntAbonos);

    const paramsAntGastos = sucursalId
      ? [fechaAntDesde, fechaAntHasta, sucursalId]
      : [fechaAntDesde, fechaAntHasta];

    const [gastosAnt] = await db.query(`
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM gastos
      WHERE fecha BETWEEN ? AND ?
      ${whereSucursalAntGastos}
    `, paramsAntGastos);

    return {
      ingresos,
      gastos,
      totalIngresos: ingresos.reduce((a, i) => a + Number(i.monto), 0),
      totalGastos:   gastos.reduce((a, g) => a + Number(g.monto), 0),
      periodoAnterior: {
        totalIngresos: Number(ingresosAnt[0].total),
        totalGastos:   Number(gastosAnt[0].total),
      }
    };
  },
};

module.exports = IngresoModel;