// src/routes/pacientes.routes.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { predecirCitas } = require('../services/decisionTree.service');


// ── GET /api/pacientes ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, CONCAT(p.nombre, ' ', p.apellido) AS nombre,
             s.nombre AS sucursal, s.id AS sucursal_id
      FROM pacientes p
      JOIN sucursales s ON s.id = p.sucursal_pref
      ORDER BY p.nombre
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/pacientes/:id/citas ──────────────────────────────────────────────
router.get('/:id/citas', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.fecha, c.hora, c.motivo, c.estado,
             t.nombre  AS tratamiento,
             st.nombre AS subtratamiento,
             st.intervalo_dias,
             s.id      AS sucursal_id,
             s.nombre  AS sucursal_nombre,
             CONCAT(p.nombre, ' ', p.apellido) AS paciente_nombre
      FROM citas c
      JOIN tratamientos    t  ON t.id  = c.tratamiento_id
      JOIN subtratamientos st ON st.id = c.subtratamiento_id
      JOIN sucursales      s  ON s.id  = c.sucursal_id
      JOIN pacientes       p  ON p.id  = c.paciente_id
      WHERE c.paciente_id = ? AND c.estado = 'realizada'
      ORDER BY c.fecha ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/pacientes/:id/predicciones?meses=2 ───────────────────────────────
router.get('/:id/predicciones', async (req, res) => {
  const meses = parseInt(req.query.meses) || 2;
  try {
    const [citas] = await db.query(`
      SELECT c.fecha, c.hora, c.motivo,
             t.nombre  AS tratamiento,
             st.nombre AS subtratamiento,
             st.intervalo_dias,
             s.id      AS sucursal_id,
             s.nombre  AS sucursal_nombre,
             CONCAT(p.nombre, ' ', p.apellido) AS paciente_nombre
      FROM citas c
      JOIN tratamientos    t  ON t.id  = c.tratamiento_id
      JOIN subtratamientos st ON st.id = c.subtratamiento_id
      JOIN sucursales      s  ON s.id  = c.sucursal_id
      JOIN pacientes       p  ON p.id  = c.paciente_id
      WHERE c.paciente_id = ? AND c.estado = 'realizada'
      ORDER BY c.fecha ASC
    `, [req.params.id]);

    if (!citas.length) return res.json({ predicciones: [], modelo: null });

    const result = predecirCitas(citas, meses);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/calendario?meses=2 ───────────────────────────────────────────────
// Devuelve TODOS los pacientes con sus predicciones para pintar el calendario
router.get('/calendario/todos', async (req, res) => {
  const meses = parseInt(req.query.meses) || 2;
  try {
    // Obtener todos los pacientes
    const [pacientes] = await db.query(`
      SELECT id, CONCAT(nombre, ' ', apellido) AS nombre, sucursal_pref
      FROM pacientes ORDER BY nombre
    `);

    const todasPredicciones  = [];
    const todasConfirmadas   = [];

    // 1. Obtener TODAS las citas pendientes del rango de 2 meses
    //    para poder excluir predicciones que ya tienen cita confirmada
    const ahora  = new Date();
    const hoy    = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
    const limite = new Date(ahora);
    limite.setMonth(limite.getMonth() + meses);
    const limiteStr = `${limite.getFullYear()}-${String(limite.getMonth()+1).padStart(2,'0')}-${String(limite.getDate()).padStart(2,'0')}`;

    console.log('Rango pendientes:', hoy, '->', limiteStr);

    const [citasPendientes] = await db.query(`
      SELECT
        c.id, c.fecha, c.hora, c.motivo, c.notas,
        c.paciente_id,
        CONCAT(p.nombre, ' ', p.apellido) AS paciente_nombre,
        t.nombre  AS tratamiento,
        st.nombre AS subtratamiento,
        s.id      AS sucursal_id,
        s.nombre  AS sucursal_nombre
      FROM citas c
      JOIN pacientes       p  ON p.id  = c.paciente_id
      JOIN tratamientos    t  ON t.id  = c.tratamiento_id
      JOIN subtratamientos st ON st.id = c.subtratamiento_id
      JOIN sucursales      s  ON s.id  = c.sucursal_id
      WHERE c.estado = 'pendiente'
        AND c.fecha >= ?
      ORDER BY c.fecha ASC, c.hora ASC
    `, [ hoy]);

    // Construir un Set con "paciente_id|fecha" de citas ya confirmadas
    // para no mostrar predicción duplicada en esa fecha
    const clavesCitasConfirmadas = new Set(
      citasPendientes.map(c => {
        const fecha = typeof c.fecha === 'string'
          ? c.fecha.split('T')[0]
          : c.fecha.toISOString().split('T')[0];
        return `${c.paciente_id}|${fecha}`;
      })
    );

    // 2. Generar predicciones para cada paciente
    for (const pac of pacientes) {
      const [historial] = await db.query(`
        SELECT c.fecha, c.hora, c.motivo,
               t.nombre  AS tratamiento,
               st.nombre AS subtratamiento,
               st.intervalo_dias,
               s.id      AS sucursal_id,
               s.nombre  AS sucursal_nombre,
               CONCAT(p.nombre, ' ', p.apellido) AS paciente_nombre
        FROM citas c
        JOIN tratamientos    t  ON t.id  = c.tratamiento_id
        JOIN subtratamientos st ON st.id = c.subtratamiento_id
        JOIN sucursales      s  ON s.id  = c.sucursal_id
        JOIN pacientes       p  ON p.id  = c.paciente_id
        WHERE c.paciente_id = ? AND c.estado = 'realizada'
        ORDER BY c.fecha ASC
      `, [pac.id]);

      if (historial.length < 2) continue;

      const { predicciones } = predecirCitas(historial, meses);

      predicciones.forEach(pred => {
        pred.paciente_id    = pac.id;
        pred.paciente_nombre = pac.nombre;
        pred.tipo           = 'prediccion';

        // Solo agregar si NO existe ya una cita confirmada ese día para ese paciente
        const clave = `${pac.id}|${pred.fecha}`;
        if (!clavesCitasConfirmadas.has(clave)) {
          todasPredicciones.push(pred);
        }
      });
    }

    // 3. Marcar las citas confirmadas con tipo para diferenciarlas en el frontend
    citasPendientes.forEach(c => {
      todasConfirmadas.push({
        ...c,
        fecha:     typeof c.fecha === 'string'
                 ? c.fecha.split('T')[0]
                 : c.fecha.toISOString().split('T')[0],
        hora:      String(c.hora).slice(0, 5),
        tipo:      'confirmada',
        confianza: 100,
      });
    });

    // 4. Devolver ambas listas separadas para que el frontend las pinte diferente
    /*console.log('=== DEBUG CALENDARIO ===');
    console.log('Fecha hoy:', hoy);
    console.log('Fecha limite:', limiteStr);
    console.log('Citas pendientes encontradas:', citasPendientes.length);
    console.log('Detalle pendientes:', JSON.stringify(citasPendientes, null, 2));
    console.log('Predicciones generadas:', todasPredicciones.length);
    console.log('========================');*/
    res.json({
      predicciones: todasPredicciones,
      confirmadas:  todasConfirmadas,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
