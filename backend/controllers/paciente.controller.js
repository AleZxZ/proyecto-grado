const PacienteModel  = require('../models/paciente.model');
const { predecirCitas } = require('../services/decisionTree.service');
const UsuarioModel   = require('../models/usuario.model');
const HistorialModel = require('../models/historial.model');

const PacienteController = {

  getTodos: async (req, res) => {
    try {
      const pacientes = await PacienteModel.getTodos();
      res.json(pacientes);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getCitas: async (req, res) => {
    try {
      const citas = await PacienteModel.getCitasRealizadas(req.params.id);
      res.json(citas);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getCalendarioTodos: async (req, res) => {
    const meses = parseInt(req.query.meses) || 2;
    try {
      const pacientes = await PacienteModel.getTodos();
      const todasPredicciones = [];
      const todasConfirmadas  = [];

      const ahora = new Date();
      const hoy   = ahora.toISOString().split('T')[0];

      const citasPendientes = await PacienteModel.getCitasPendientes(hoy);

      const clavesCitasConfirmadas = new Set(
        citasPendientes.map(c => {
          const fecha = typeof c.fecha === 'string'
            ? c.fecha.split('T')[0]
            : c.fecha.toISOString().split('T')[0];
          return `${c.paciente_id}|${fecha}`;
        })
      );

      for (const pac of pacientes) {
        const historial = await PacienteModel.getHistorialParaPrediccion(pac.id);
        if (historial.length < 2) continue;

        const { predicciones } = predecirCitas(historial, meses);
        predicciones.forEach(pred => {
          pred.paciente_id     = pac.id;
          pred.paciente_nombre = pac.nombre; // ← viene de getTodos como CONCAT
          pred.tipo            = 'prediccion';
          const clave = `${pac.id}|${pred.fecha}`;
          if (!clavesCitasConfirmadas.has(clave)) {
            todasPredicciones.push(pred);
          }
        });
      }

      citasPendientes.forEach(c => {
        todasConfirmadas.push({
          ...c,
          fecha: typeof c.fecha === 'string'
            ? c.fecha.split('T')[0]
            : c.fecha.toISOString().split('T')[0],
          hora:      String(c.hora).slice(0, 5),
          tipo:      'confirmada',
          confianza: 100,
        });
      });

      res.json({ predicciones: todasPredicciones, confirmadas: todasConfirmadas });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getTodosConDetalle: async (req, res) => {
    try {
      const pacientes = await PacienteModel.getTodosConDetalle();
      res.json(pacientes);
    } catch (e) {
      console.error('ERROR getTodosConDetalle:', e.message);
      res.status(500).json({ error: e.message });
    }
  },

  getByIdConDetalle: async (req, res) => {
    try {
      const paciente = await PacienteModel.getByIdConDetalle(req.params.id);
      if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
      const historial = await HistorialModel.getByPacienteId(req.params.id);
      res.json({ ...paciente, historial });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  crear: async (req, res) => {
    const { usuario, paciente, historial } = req.body;

    // ← validar nombre y apellido en usuario
    if (!usuario?.email || !usuario?.password ||
        !usuario?.nombre || !usuario?.apellido) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
     if (!emailRegex.test(usuario.email)) {
      return res.status(400).json({ error: 'El email no tiene un formato válido' });
    }

    try {
      const emailExiste = await UsuarioModel.verificarEmailExiste(usuario.email);
      if (emailExiste) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }

      // 1. crear usuario con nombre y apellido
      const resultUsuario = await UsuarioModel.crear({
        nombre:   usuario.nombre,
        apellido: usuario.apellido,
        email:    usuario.email,
        password: usuario.password,
        celular:  usuario.celular,
        rol:      'paciente'
      });
      const usuario_id = resultUsuario.insertId;

      // 2. crear paciente sin nombre ni apellido
      const resultPaciente = await PacienteModel.crear({
        ...paciente,
        usuario_id
      });
      const paciente_id = resultPaciente.insertId;

      // 3. crear historial clínico
      if (historial) {
        await HistorialModel.crear({ ...historial, paciente_id });
      }

      res.status(201).json({
        mensaje: 'Paciente registrado correctamente',
        paciente_id,
        usuario_id,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  actualizar: async (req, res) => {
    const { id } = req.params;
    const { usuario, paciente, historial, nuevaPassword } = req.body;

    console.log('BODY recibido:', JSON.stringify(req.body, null, 2));

    try {
      // 1. actualizar paciente (sin nombre ni apellido)
      if (paciente) {
        await PacienteModel.actualizar(id, paciente);
      }

      const pacienteActual = await PacienteModel.getByIdConDetalle(id);

      if (pacienteActual?.usuario_id) {
        // 2. actualizar usuario con nombre y apellido
        if (usuario) {
          await UsuarioModel.actualizar(pacienteActual.usuario_id, {
            nombre:   usuario.nombre,
            apellido: usuario.apellido,
            email:    usuario.email,
            celular:  usuario.celular,
            rol:      pacienteActual.rol,
            activo:   pacienteActual.activo ?? 1,
          });
        }
        // 3. actualizar contraseña
        if (nuevaPassword && nuevaPassword.length >= 6) {
          await UsuarioModel.actualizarPassword(
            pacienteActual.usuario_id, nuevaPassword
          );
        }
      }

      // 4. actualizar historial clínico
      if (historial) {
        await HistorialModel.actualizar(id, historial);
      }

      res.json({ mensaje: 'Paciente actualizado correctamente' });
    } catch (e) {
      console.error('ERROR actualizar paciente:', e.message);
      res.status(500).json({ error: e.message });
    }
  },

  getHistorialClinico: async (req, res) => {
    try {
      const historial = await PacienteModel.getHistorialClinico(req.params.id);
      res.json(historial);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  //Para pacientes 

  getMisCitas: async (req, res) => {
    try {
      // req.params.id es el usuario_id
      // necesitamos el paciente_id
      const paciente = await PacienteModel.getByUsuarioId(req.params.id);
      if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

      const citas = await PacienteModel.getMisCitas(paciente.id);
      res.json(citas);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getMisPagos: async (req, res) => {
    try {
      // req.params.id ya es el paciente_id
      const pagos = await PacienteModel.getMisPagos(req.params.id);
      res.json(pagos);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  getMiOdontograma: async (req, res) => {
    try {
      const odontograma = await PacienteModel.getMiOdontograma(req.params.id);
      res.json(odontograma);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
  getByUsuarioId: async (req, res) => {
    try {
      const paciente = await PacienteModel.getByUsuarioId(req.params.usuarioId);
      if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
      res.json(paciente);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};

module.exports = PacienteController;