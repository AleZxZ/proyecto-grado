const CitaModel = require('../models/cita.model');
const NotificacionModel = require('../models/notificacion.model');


const CitaController = {

  confirmar: async (req, res) => {
    const { paciente_id, sucursal_id, tratamiento_id,
            subtratamiento_id, fecha, hora } = req.body;

    if (!paciente_id || !sucursal_id || !tratamiento_id ||
        !subtratamiento_id || !fecha || !hora) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
      const existe = await CitaModel.verificarExiste(paciente_id, fecha);
      if (existe.length > 0) {
        return res.status(409).json({
          error: 'Ya existe una cita pendiente para este paciente en esa fecha',
          cita_id: existe[0].id
        });
      }
      const result   = await CitaModel.crear(req.body);
      const citaCreada = await CitaModel.getById(result.insertId);
      res.status(201).json({ mensaje: 'Cita confirmada correctamente', cita: citaCreada });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
  crear: async (req, res) => {
    const { paciente_id, sucursal_id, tratamiento_id,
            subtratamiento_id, fecha, hora, motivo, notas, estado } = req.body;

    if (!paciente_id || !sucursal_id || !fecha || !hora) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
      const result   = await CitaModel.crear(req.body);
      const citaCreada = await CitaModel.getById(result.insertId);
      res.status(201).json({ mensaje: 'Cita creada correctamente', cita: citaCreada });
    } catch (e) { res.status(400).json({ error: e.message }); }
  },

  getPendientes: async (req, res) => {
    try {
      const rows = await CitaModel.getPendientes();
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getTratamientos: async (req, res) => {
    try {
      const rows = await CitaModel.getTratamientosPorSucursal(req.params.sucursalId);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getDoctores: async (req, res) => {
    try {
      const rows = await CitaModel.getDoctoresPorSucursal(req.params.sucursalId);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  eliminar: async (req, res) => {
    try {
      const resultado = await CitaModel.eliminar(req.params.id);
      if (!resultado) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }
      res.json({ mensaje: 'Cita eliminada correctamente', id: resultado });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
  getCalendarioPublico: async (req, res) => {
    try {
      const citas = await CitaModel.getCalendarioPublico();
      res.json(citas);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getSolicitudesPendientes: async (req, res) => {
    try {
      const sucursalId = req.usuario?.sucursal_id ?? null;
      const rows = await CitaModel.getSolicitudesPendientes(sucursalId);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  confirmarSolicitud: async (req, res) => {
    const { tratamiento_id, subtratamiento_id, tratamiento_personalizado } = req.body;

    if (!subtratamiento_id && !tratamiento_personalizado) {
      return res.status(400).json({ error: 'Selecciona un tratamiento o especifica uno manualmente' });
    }

    try {
      // obtener doctor_id del usuario logueado
      const doctorId = await CitaModel.getDoctorByUsuarioId(req.usuario.id);
      console.log('doctorId:', doctorId); // ← agregar
      await CitaModel.confirmarSolicitud(
        req.params.id, tratamiento_id, subtratamiento_id, tratamiento_personalizado, doctorId
      );

      const cita = await CitaModel.getById(req.params.id);
      if (cita) {
        const usuarioId = await NotificacionModel.getUsuarioIdByPacienteId(cita.paciente_id);
        if (usuarioId) {
          await NotificacionModel.crear(
            usuarioId,
            '✓ Cita confirmada',
            `Tu cita para el ${new Date(cita.fecha).toLocaleDateString('es-BO', {
              day: '2-digit', month: 'long', year: 'numeric'
            })} a las ${String(cita.hora).slice(0,5)} ha sido confirmada.`
          );
        }
      }

      res.json({ mensaje: 'Solicitud confirmada correctamente' });
    } catch (e) { 
      console.error('ERROR confirmar:', e.message); // ← agregar
      res.status(500).json({ error: e.message }); }
  },

  getPendientesAsignar: async (req, res) => {
    try {
      const sucursalId = req.usuario?.sucursal_id ?? null;
      const rows = await CitaModel.getPendientesAsignar(sucursalId);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  asignarTratamiento: async (req, res) => {
    const { tratamiento_id, subtratamiento_id, tratamiento_personalizado } = req.body;

    if (!subtratamiento_id && !tratamiento_personalizado) {
      return res.status(400).json({ error: 'Selecciona un tratamiento o especifica uno manualmente' });
    }

    try {
      await CitaModel.asignarTratamiento(
        req.params.id, tratamiento_id, subtratamiento_id, tratamiento_personalizado
      );
      res.json({ mensaje: 'Tratamiento asignado correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  rechazarSolicitud: async (req, res) => {
    try {
      const { motivo } = req.body;
      const cita = await CitaModel.getById(req.params.id);
      await CitaModel.rechazarSolicitud(req.params.id);

      if (cita) {
        const usuarioId = await NotificacionModel.getUsuarioIdByPacienteId(
          cita.paciente_id
        );
        if (usuarioId) {
          const mensaje = motivo
            ? `Tu solicitud de cita para el ${new Date(cita.fecha).toLocaleDateString('es-BO', {
                day: '2-digit', month: 'long', year: 'numeric'
              })} a las ${String(cita.hora).slice(0,5)} no pudo ser confirmada. Motivo: ${motivo}`
            : `Tu solicitud de cita para el ${new Date(cita.fecha).toLocaleDateString('es-BO', {
                day: '2-digit', month: 'long', year: 'numeric'
              })} a las ${String(cita.hora).slice(0,5)} no pudo ser confirmada. Por favor solicita una nueva cita.`;

          await NotificacionModel.crear(
            usuarioId,
            '✕ Solicitud de cita rechazada',
            mensaje
          );
        }
      }

      res.json({ mensaje: 'Solicitud rechazada' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getCitasHoy: async (req, res) => {
    try {
      const sucursalId = req.usuario?.sucursal_id ?? null;
      const rows = await CitaModel.getCitasHoy(sucursalId);
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getPacientesAtendidosHoy: async (req, res) => {
    try {
      const sucursalId = req.usuario?.sucursal_id ?? null;
      const total = await CitaModel.getPacientesAtendidosHoy(sucursalId);
      res.json({ total });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
  cambiarEstado: async (req, res) => {
    const { estado } = req.body;
    if (!['pendiente','realizada','cancelada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    try {
      await CitaModel.cambiarEstado(req.params.id, estado);
      res.json({ mensaje: 'Estado actualizado correctamente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};

module.exports = CitaController;