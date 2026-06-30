const db = require('../config/db');

const HistorialModel = {

  crear: async (datos) => {
    const { paciente_id, grupo_sanguineo, enfermedad_sistemica,
            intervencion_quirurgica, hemorragia_anormal,
            alergia_medicamentos, medicacion_actual, observaciones } = datos;
    const [result] = await db.query(`
      INSERT INTO historial_clinico
      (paciente_id, grupo_sanguineo, enfermedad_sistemica,
       intervencion_quirurgica, hemorragia_anormal,
       alergia_medicamentos, medicacion_actual, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [paciente_id, grupo_sanguineo, enfermedad_sistemica,
        intervencion_quirurgica, hemorragia_anormal ? 1 : 0,
        alergia_medicamentos, medicacion_actual, observaciones]);
    return result;
  },

  getByPacienteId: async (pacienteId) => {
    const [rows] = await db.query(
      'SELECT * FROM historial_clinico WHERE paciente_id = ?',
      [pacienteId]
    );
    return rows[0];
  },

  actualizar: async (pacienteId, datos) => {
    const { grupo_sanguineo, enfermedad_sistemica,
            intervencion_quirurgica, hemorragia_anormal,
            alergia_medicamentos, medicacion_actual, observaciones } = datos;
    await db.query(`
      UPDATE historial_clinico SET
        grupo_sanguineo         = ?,
        enfermedad_sistemica    = ?,
        intervencion_quirurgica = ?,
        hemorragia_anormal      = ?,
        alergia_medicamentos    = ?,
        medicacion_actual       = ?,
        observaciones           = ?
      WHERE paciente_id = ?
    `, [grupo_sanguineo, enfermedad_sistemica, intervencion_quirurgica,
        hemorragia_anormal ? 1 : 0, alergia_medicamentos,
        medicacion_actual, observaciones, pacienteId]);
  }
};

module.exports = HistorialModel;