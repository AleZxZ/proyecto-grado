const db = require('../config/db');

const NotificacionModel = {

  crear: async (usuarioId, titulo, mensaje) => {
    const [result] = await db.query(`
      INSERT INTO notificaciones (usuario_id, titulo, mensaje)
      VALUES (?, ?, ?)
    `, [usuarioId, titulo, mensaje]);
    return result;
  },

  getByUsuario: async (usuarioId) => {
    const [rows] = await db.query(`
      SELECT * FROM notificaciones
      WHERE usuario_id = ?
      ORDER BY creado_en DESC
      LIMIT 20
    `, [usuarioId]);
    return rows;
  },

  getNoLeidas: async (usuarioId) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) AS total
      FROM notificaciones
      WHERE usuario_id = ? AND leida = 0
    `, [usuarioId]);
    return Number(rows[0].total);
  },

  marcarLeida: async (id) => {
    await db.query(`
      UPDATE notificaciones SET leida = 1 WHERE id = ?
    `, [id]);
  },

  marcarTodasLeidas: async (usuarioId) => {
    await db.query(`
      UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?
    `, [usuarioId]);
  },
  getUsuarioIdByPacienteId: async (pacienteId) => {
    const [rows] = await db.query(`
        SELECT u.id AS usuario_id
        FROM pacientes p
        JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.id = ?
    `, [pacienteId]);
    return rows[0]?.usuario_id ?? null;
    },
};

module.exports = NotificacionModel;