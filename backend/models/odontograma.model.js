const db = require('../config/db');

const OdontogramaModel = {

  getByPaciente: async (pacienteId) => {
    const [rows] = await db.query(`
      SELECT o.*, t.nombre AS tratamiento, st.nombre AS subtratamiento
      FROM odontograma o
      LEFT JOIN tratamientos    t  ON t.id  = o.tratamiento_id
      LEFT JOIN subtratamientos st ON st.id = o.subtratamiento_id
      WHERE o.paciente_id = ? AND o.activo = 1
      ORDER BY o.diente, o.cara, o.creado_en DESC
    `, [pacienteId]);
    return rows;
  },

  getHistorialDiente: async (pacienteId, diente) => {
    const [rows] = await db.query(`
      SELECT o.*, t.nombre AS tratamiento, st.nombre AS subtratamiento
      FROM odontograma o
      LEFT JOIN tratamientos    t  ON t.id  = o.tratamiento_id
      LEFT JOIN subtratamientos st ON st.id = o.subtratamiento_id
      WHERE o.paciente_id = ? AND o.diente = ?
      ORDER BY o.creado_en DESC
    `, [pacienteId, diente]);
    return rows;
  },

  getHistorialCara: async (pacienteId, diente, cara) => {
    const [rows] = await db.query(`
      SELECT o.*, t.nombre AS tratamiento, st.nombre AS subtratamiento
      FROM odontograma o
      LEFT JOIN tratamientos    t  ON t.id  = o.tratamiento_id
      LEFT JOIN subtratamientos st ON st.id = o.subtratamiento_id
      WHERE o.paciente_id = ? AND o.diente = ? AND o.cara = ?
      ORDER BY o.creado_en DESC
    `, [pacienteId, diente, cara]);
    return rows;
  },

  guardarCara: async (datos) => {
    const { paciente_id, diente, cara, estado,
            tratamiento_id, subtratamiento_id, notas, tipo } = datos;

    await db.query(`
      UPDATE odontograma SET activo = 0
      WHERE paciente_id = ? AND diente = ? AND cara = ?
    `, [paciente_id, diente, cara]);

    const [result] = await db.query(`
      INSERT INTO odontograma
        (paciente_id, diente, cara, estado, tratamiento_id,
        subtratamiento_id, notas, activo, tipo)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `, [paciente_id, diente, cara, estado,
        tratamiento_id || null, subtratamiento_id || null,
        notas || null, tipo || 'cara']);
    return result;
  },

  guardarDienteCompleto: async (pacienteId, diente, estado,
                               tratamientoId, subtratamientoId, notas) => {
    const caras = ['vestibular','palatino','mesial','distal','oclusal'];
    let primerInsertId = null;

    for (const cara of caras) {
      await db.query(`
        UPDATE odontograma SET activo = 0
        WHERE paciente_id = ? AND diente = ? AND cara = ?
      `, [pacienteId, diente, cara]);

      const [result] = await db.query(`
        INSERT INTO odontograma
          (paciente_id, diente, cara, estado, tratamiento_id,
          subtratamiento_id, notas, activo, tipo)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'diente_completo')
      `, [pacienteId, diente, cara, estado,
          tratamientoId || null, subtratamientoId || null, notas || null]);

      if (!primerInsertId) primerInsertId = result.insertId;
    }

    return primerInsertId; // ← retorna el id del primer registro
  },
  getHistorialCompleto: async (pacienteId) => {
    const [rows] = await db.query(`
      SELECT o.*, t.nombre AS tratamiento, st.nombre AS subtratamiento
      FROM odontograma o
      LEFT JOIN tratamientos    t  ON t.id  = o.tratamiento_id
      LEFT JOIN subtratamientos st ON st.id = o.subtratamiento_id
      WHERE o.paciente_id = ?
      ORDER BY o.creado_en DESC
    `, [pacienteId]);
    return rows;
  },
  editarRegistro: async (id, datos) => {
    const { estado, tratamiento_id, subtratamiento_id, notas } = datos;
    await db.query(`
      UPDATE odontograma SET
        estado            = ?,
        tratamiento_id    = ?,
        subtratamiento_id = ?,
        notas             = ?
      WHERE id = ?
    `, [estado, tratamiento_id || null, subtratamiento_id || null,
        notas || null, id]);
  },
  eliminarRegistro: async (id) => {
    await db.query('DELETE FROM odontograma WHERE id = ?', [id]);
  },
};

module.exports = OdontogramaModel;