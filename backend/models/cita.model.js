const db = require('../config/db');

const CitaModel = {

  verificarExiste: async (pacienteId, fecha) => {
    const [rows] = await db.query(
      `SELECT id FROM citas 
       WHERE paciente_id = ? AND fecha = ? AND estado = 'pendiente'`,
      [pacienteId, fecha]
    );
    return rows;
  },

  crear: async (datos) => {
    const { paciente_id, sucursal_id, tratamiento_id, subtratamiento_id,
            doctor_id, fecha, hora, motivo, notas, estado } = datos;

    // validar que la fecha no sea pasada
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaCita = new Date(fecha + 'T00:00:00');
    if (fechaCita < hoy) {
      throw new Error('No se puede crear una cita en una fecha pasada');
    }

    const [result] = await db.query(
      `INSERT INTO citas 
      (paciente_id, sucursal_id, tratamiento_id, subtratamiento_id,
        doctor_id, fecha, hora, motivo, estado, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [paciente_id, sucursal_id, tratamiento_id || null, subtratamiento_id || null,
      doctor_id || null, fecha, hora, motivo || 'Control periódico',
      estado || 'pendiente', notas || null]
    );
    return result;
  },

  getById: async (id) => {
    const [rows] = await db.query(`
      SELECT c.id, c.fecha, c.hora, c.motivo, c.estado,
            c.paciente_id, c.sucursal_id,
            c.tratamiento_id, c.subtratamiento_id,
            c.tratamiento_personalizado,
            CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre,
            t.nombre  AS tratamiento,
            st.nombre AS subtratamiento,
            s.nombre  AS sucursal_nombre,
            s.id      AS sucursal_id
      FROM citas c
      JOIN pacientes       p  ON p.id  = c.paciente_id
      JOIN usuarios        u  ON u.id  = p.usuario_id
      JOIN sucursales      s  ON s.id  = c.sucursal_id
      LEFT JOIN tratamientos    t  ON t.id  = c.tratamiento_id
      LEFT JOIN subtratamientos st ON st.id = c.subtratamiento_id
      WHERE c.id = ?
    `, [id]);
    return rows[0];
  },

  getPendientes: async () => {
    const [rows] = await db.query(`
      SELECT c.id, c.fecha, c.hora, c.motivo, c.notas,
             CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre,
             t.nombre  AS tratamiento,
             st.nombre AS subtratamiento,
             s.nombre  AS sucursal_nombre,
             s.id      AS sucursal_id
      FROM citas c
      JOIN pacientes       p  ON p.id  = c.paciente_id
      JOIN usuarios        u  ON u.id  = p.usuario_id
      JOIN tratamientos    t  ON t.id  = c.tratamiento_id
      JOIN subtratamientos st ON st.id = c.subtratamiento_id
      JOIN sucursales      s  ON s.id  = c.sucursal_id
      WHERE c.estado = 'pendiente'
        AND c.fecha >= CURDATE()
      ORDER BY c.fecha ASC, c.hora ASC
    `);
    return rows;
  },

  getTratamientosPorSucursal: async (sucursalId) => {
    const [rows] = await db.query(`
      SELECT t.id AS tratamiento_id, t.nombre AS tratamiento,
             st.id AS subtratamiento_id, st.nombre AS subtratamiento,
             st.intervalo_dias
      FROM tratamientos t
      JOIN subtratamientos st ON st.tratamiento_id = t.id
      WHERE t.sucursal_id = ? AND st.activo = 1
      ORDER BY t.nombre, st.nombre
    `, [sucursalId]);
    return rows;
  },

  getDoctoresPorSucursal: async (sucursalId) => {
    const [rows] = await db.query(`
      SELECT id, nombre, especialidad
      FROM doctores
      WHERE sucursal_id = ? AND activo = 1
      ORDER BY nombre
    `, [sucursalId]);
    return rows;
  },

  eliminar: async (id) => {
    const [existe] = await db.query(
      'SELECT id FROM citas WHERE id = ?', [id]
    );
    if (existe.length === 0) return null;
    await db.query('DELETE FROM citas WHERE id = ?', [id]);
    return id;
  },

  getCalendarioPublico: async () => {
    const [rows] = await db.query(`
      SELECT c.fecha, c.hora, c.sucursal_id,
            s.nombre AS sucursal_nombre
      FROM citas c
      JOIN sucursales s ON s.id = c.sucursal_id
      WHERE c.estado = 'pendiente'
        AND c.fecha >= CURDATE()
      ORDER BY c.fecha ASC, c.hora ASC
    `);
    return rows;
  },

  getSolicitudesPendientes: async (sucursalId) => {
    const whereSucursal = sucursalId ? 'AND c.sucursal_id = ?' : '';
    const params        = sucursalId ? [sucursalId] : [];

    const [rows] = await db.query(`
      SELECT c.id, c.fecha, c.hora, c.notas, c.creado_en,
            c.sucursal_id,                                    -- ← agregar
            CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre,
            s.nombre AS sucursal_nombre
      FROM citas c
      JOIN pacientes  p ON p.id  = c.paciente_id
      JOIN usuarios   u ON u.id  = p.usuario_id
      JOIN sucursales s ON s.id  = c.sucursal_id
      WHERE c.estado = 'solicitada'
      ${whereSucursal}
      ORDER BY c.creado_en DESC
    `, params);
    return rows;
  },

  confirmarSolicitud: async (id, tratamientoId, subtratamientoId, personalizado, doctorId) => {
    await db.query(`
      UPDATE citas SET
        estado                    = 'pendiente',
        tratamiento_id            = ?,
        subtratamiento_id         = ?,
        tratamiento_personalizado = ?,
        doctor_id                 = ?
      WHERE id = ?
    `, [tratamientoId || null, subtratamientoId || null, personalizado || null, doctorId || null, id]);
  },

  getPendientesAsignar: async (sucursalId) => {
    const whereSucursal = sucursalId ? 'AND c.sucursal_id = ?' : '';
    const params        = sucursalId ? [sucursalId] : [];

    const [rows] = await db.query(`
      SELECT c.id, c.fecha, c.hora, c.motivo, c.notas,
            c.tratamiento_personalizado, c.sucursal_id,
            CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre,
            s.nombre AS sucursal_nombre
      FROM citas c
      JOIN pacientes  p ON p.id  = c.paciente_id
      JOIN usuarios   u ON u.id  = p.usuario_id
      JOIN sucursales s ON s.id  = c.sucursal_id
      WHERE c.tratamiento_personalizado IS NOT NULL
      ${whereSucursal}
      ORDER BY c.fecha DESC, c.hora DESC
    `, params);
    return rows;
  },

  asignarTratamiento: async (id, tratamientoId, subtratamientoId, personalizado) => {
    await db.query(`
      UPDATE citas SET
        tratamiento_id            = ?,
        subtratamiento_id         = ?,
        tratamiento_personalizado = ?
      WHERE id = ?
    `, [tratamientoId || null, subtratamientoId || null, personalizado || null, id]);
  },

  rechazarSolicitud: async (id) => {
    await db.query(`
      UPDATE citas SET estado = 'cancelada'
      WHERE id = ?
    `, [id]);
  },

  getCitasHoy: async (sucursalId) => {
    const whereSucursal = sucursalId ? 'AND c.sucursal_id = ?' : '';
    const params        = sucursalId ? [sucursalId] : [];

    const [rows] = await db.query(`
      SELECT c.id, c.fecha, c.hora, c.motivo, c.notas,
            CONCAT(u.nombre, ' ', u.apellido) AS paciente_nombre,
            t.nombre  AS tratamiento,
            st.nombre AS subtratamiento,
            s.nombre  AS sucursal_nombre
      FROM citas c
      JOIN pacientes       p  ON p.id  = c.paciente_id
      JOIN usuarios        u  ON u.id  = p.usuario_id
      JOIN sucursales      s  ON s.id  = c.sucursal_id
      LEFT JOIN tratamientos    t  ON t.id  = c.tratamiento_id
      LEFT JOIN subtratamientos st ON st.id = c.subtratamiento_id
      WHERE c.estado = 'pendiente'
        AND DATE(c.fecha) = CURDATE()
        ${whereSucursal}
      ORDER BY c.hora ASC
    `, params);
    return rows;
  },

  getPacientesAtendidosHoy: async (sucursalId) => {
    const whereSucursal = sucursalId ? 'AND c.sucursal_id = ?' : '';
    const params        = sucursalId ? [sucursalId] : [];

    const [rows] = await db.query(`
      SELECT COUNT(DISTINCT c.paciente_id) AS total
      FROM citas c
      WHERE c.estado = 'realizada'
        AND DATE(c.fecha) = CURDATE()
        ${whereSucursal}
    `, params);
    return Number(rows[0].total);
  },
  cambiarEstado: async (id, estado) => {
    await db.query(`
      UPDATE citas SET estado = ? WHERE id = ?
    `, [estado, id]);
  },
  getDoctorByUsuarioId: async (usuarioId) => {
    const [rows] = await db.query(`
      SELECT id FROM doctores WHERE usuario_id = ?
    `, [usuarioId]);
    return rows[0]?.id ?? null;
  },
};

module.exports = CitaModel;