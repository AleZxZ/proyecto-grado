// src/routes/citas.routes.js
// Endpoint para confirmar una cita predicha y guardarla en la tabla citas

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// ── POST /api/citas/confirmar ─────────────────────────────────────────────────
// Recibe la predicción del frontend y la guarda como cita pendiente
router.post('/confirmar', async (req, res) => {
  const {
    paciente_id,
    sucursal_id,
    tratamiento_id,
    subtratamiento_id,
    doctor_id,
    fecha,
    hora,
    motivo,
    notas,
  } = req.body;

  // Validar campos obligatorios
  if (!paciente_id || !sucursal_id || !tratamiento_id || !subtratamiento_id || !fecha || !hora) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios: paciente_id, sucursal_id, tratamiento_id, subtratamiento_id, fecha, hora'
    });
  }

  try {
    // Verificar que no exista ya una cita pendiente para ese paciente en esa fecha
    const [existe] = await db.query(
      `SELECT id FROM citas 
       WHERE paciente_id = ? AND fecha = ? AND estado = 'pendiente'`,
      [paciente_id, fecha]
    );

    if (existe.length > 0) {
      return res.status(409).json({
        error: 'Ya existe una cita pendiente para este paciente en esa fecha',
        cita_id: existe[0].id
      });
    }

    // Insertar la cita como pendiente
    const [result] = await db.query(
      `INSERT INTO citas 
       (paciente_id, sucursal_id, tratamiento_id, subtratamiento_id, 
        doctor_id, fecha, hora, motivo, estado, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
      [
        paciente_id,
        sucursal_id,
        tratamiento_id,
        subtratamiento_id,
        doctor_id || null,
        fecha,
        hora,
        motivo || 'Control periódico',
        notas || null,
      ]
    );

    // Devolver la cita recién creada con todos sus datos
    const [citaCreada] = await db.query(
      `SELECT 
         c.id, c.fecha, c.hora, c.motivo, c.estado, c.notas,
         c.paciente_id,
         CONCAT(p.nombre, ' ', p.apellido) AS paciente_nombre,
         t.nombre  AS tratamiento,
         st.nombre AS subtratamiento,
         s.nombre  AS sucursal_nombre,
         s.id      AS sucursal_id,
         d.nombre  AS doctor_nombre
       FROM citas c
       JOIN pacientes       p  ON p.id  = c.paciente_id
       JOIN tratamientos    t  ON t.id  = c.tratamiento_id
       JOIN subtratamientos st ON st.id = c.subtratamiento_id
       JOIN sucursales      s  ON s.id  = c.sucursal_id
       LEFT JOIN doctores   d  ON d.id  = c.doctor_id
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      mensaje: 'Cita confirmada y agendada correctamente',
      cita: citaCreada[0]
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/citas/pendientes ─────────────────────────────────────────────────
// Lista todas las citas pendientes (útil para ver qué se agendó)
router.get('/pendientes', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         c.id, c.fecha, c.hora, c.motivo, c.notas,
         CONCAT(p.nombre, ' ', p.apellido) AS paciente_nombre,
         t.nombre  AS tratamiento,
         st.nombre AS subtratamiento,
         s.nombre  AS sucursal_nombre,
         s.id      AS sucursal_id
       FROM citas c
       JOIN pacientes       p  ON p.id  = c.paciente_id
       JOIN tratamientos    t  ON t.id  = c.tratamiento_id
       JOIN subtratamientos st ON st.id = c.subtratamiento_id
       JOIN sucursales      s  ON s.id  = c.sucursal_id
       WHERE c.estado = 'pendiente'
         AND c.fecha >= CURDATE()
       ORDER BY c.fecha ASC, c.hora ASC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message }); 
  }
});

// ── GET /api/citas/tratamientos/:sucursalId ───────────────────────────────────
// Devuelve tratamientos y subtratamientos de una sucursal para el formulario
router.get('/tratamientos/:sucursalId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         t.id AS tratamiento_id, t.nombre AS tratamiento,
         st.id AS subtratamiento_id, st.nombre AS subtratamiento,
         st.intervalo_dias
       FROM tratamientos t
       JOIN subtratamientos st ON st.tratamiento_id = t.id
       WHERE t.sucursal_id = ?
         AND st.activo = 1
       ORDER BY t.nombre, st.nombre`,
      [req.params.sucursalId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/citas/doctores/:sucursalId ───────────────────────────────────────
// Devuelve doctores de una sucursal para el selector del formulario
router.get('/doctores/:sucursalId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, especialidad 
       FROM doctores 
       WHERE sucursal_id = ? AND activo = 1
       ORDER BY nombre`,
      [req.params.sucursalId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/citas/:id ─────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const [existe] = await db.query(
      'SELECT id FROM citas WHERE id = ?',
      [req.params.id]
    );

    if (existe.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    await db.query('DELETE FROM citas WHERE id = ?', [req.params.id]);

    res.json({ mensaje: 'Cita eliminada correctamente', id: req.params.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
