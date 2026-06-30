const db = require('../config/db');

const ReporteModel = {

  getEstadisticas: async (sucursalId, fechaDesde, fechaHasta) => {
    const whereSucursal = sucursalId ? 'AND p.sucursal_pref = ?' : '';
    const params        = sucursalId
      ? [fechaDesde, fechaHasta, sucursalId]
      : [fechaDesde, fechaHasta];

    // total pacientes registrados
    const [totalPacientes] = await db.query(`
      SELECT COUNT(*) AS total
      FROM pacientes p
      WHERE 1=1 ${sucursalId ? 'AND p.sucursal_pref = ?' : ''}
    `, sucursalId ? [sucursalId] : []);

    // pacientes nuevos del período
    const [pacientesNuevos] = await db.query(`
      SELECT COUNT(*) AS total
      FROM pacientes p
      WHERE p.creado_en BETWEEN ? AND ?
      ${whereSucursal}
    `, params);

    // pacientes nuevos por mes (últimos 6 meses)
    const [porMes] = await db.query(`
      SELECT
        DATE_FORMAT(p.creado_en, '%b %Y') AS mes,
        MONTH(p.creado_en)                AS mes_num,
        YEAR(p.creado_en)                 AS anio,
        COUNT(*)                          AS total
      FROM pacientes p
      WHERE p.creado_en >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      ${sucursalId ? 'AND p.sucursal_pref = ?' : ''}
      GROUP BY mes, mes_num, anio
      ORDER BY anio ASC, mes_num ASC
    `, sucursalId ? [sucursalId] : []);

    // top 5 tratamientos más frecuentes
    const [topTratamientos] = await db.query(`
      SELECT
        t.nombre  AS tratamiento,
        COUNT(*)  AS total
      FROM odontograma o
      JOIN tratamientos t ON t.id = o.tratamiento_id
      JOIN pacientes p    ON p.id = o.paciente_id
      WHERE o.creado_en BETWEEN ? AND ?
        AND o.tratamiento_id IS NOT NULL
        AND o.activo = 1
        ${sucursalId ? 'AND p.sucursal_pref = ?' : ''}
      GROUP BY t.id, t.nombre
      ORDER BY total DESC
      LIMIT 5
    `, params);

    // distribución de estados del odontograma
    const [distribucionEstados] = await db.query(`
      SELECT
        o.estado,
        COUNT(DISTINCT o.diente) AS total
      FROM odontograma o
      JOIN pacientes p ON p.id = o.paciente_id
      WHERE o.creado_en BETWEEN ? AND ?
        AND o.activo = 1
        AND (o.tipo = 'cara' OR (o.tipo = 'diente_completo' AND o.cara = 'vestibular'))
        ${sucursalId ? 'AND p.sucursal_pref = ?' : ''}
      GROUP BY o.estado
      ORDER BY total DESC
    `, params);

    // pacientes activos vs inactivos
    const [estadoPacientes] = await db.query(`
        SELECT
            SUM(CASE WHEN u.activo = 1 THEN 1 ELSE 0 END) AS activos,
            SUM(CASE WHEN u.activo = 0 THEN 1 ELSE 0 END) AS inactivos
        FROM pacientes p
        JOIN usuarios u ON u.id = p.usuario_id
        WHERE 1=1 ${sucursalId ? 'AND p.sucursal_pref = ?' : ''}
        `, sucursalId ? [sucursalId] : []);

    return {
      totalPacientes:     Number(totalPacientes[0].total),
      pacientesNuevos:    Number(pacientesNuevos[0].total),
      porMes,
      topTratamientos,
      distribucionEstados,
      estadoPacientes:    estadoPacientes[0],
    };
  }
};

module.exports = ReporteModel;