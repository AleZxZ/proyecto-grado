const db = require('../config/db');

const AjustesModel = {

  getFechasBloqueadas: async (sucursalId) => {
    const [rows] = await db.query(`
      SELECT * FROM fechas_bloqueadas
      WHERE sucursal_id = ?
      ORDER BY fecha ASC
    `, [sucursalId]);
    return rows;
  },

  crearFechaBloqueada: async (sucursalId, fecha, motivo) => {
    const [result] = await db.query(`
      INSERT INTO fechas_bloqueadas (sucursal_id, fecha, motivo)
      VALUES (?, ?, ?)
    `, [sucursalId, fecha, motivo || null]);
    return result;
  },

  eliminarFechaBloqueada: async (id, sucursalId) => {
    await db.query(`
      DELETE FROM fechas_bloqueadas WHERE id = ? AND sucursal_id = ?
    `, [id, sucursalId]);
  },

  getTodasFechasBloqueadas: async () => {
    const [rows] = await db.query(`
      SELECT * FROM fechas_bloqueadas
      WHERE fecha >= CURDATE()
      ORDER BY fecha ASC
    `);
    return rows;
  },

  crearRangoFechasBloqueadas: async (sucursalId, fechaInicio, fechaFin, motivo) => {
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin    = new Date(fechaFin + 'T00:00:00');
    const fechas = [];

    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      const f = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      fechas.push(f);
    }

    for (const f of fechas) {
      await db.query(`
        INSERT IGNORE INTO fechas_bloqueadas (sucursal_id, fecha, motivo)
        VALUES (?, ?, ?)
      `, [sucursalId, f, motivo || null]);
    }

    return fechas.length;
  },

  getFechasBloqueadasBySucursal: async (sucursalId) => {
    const [rows] = await db.query(`
      SELECT fecha FROM fechas_bloqueadas
      WHERE sucursal_id = ? AND fecha >= CURDATE()
    `, [sucursalId]);
    return rows;
  },
};

module.exports = AjustesModel;