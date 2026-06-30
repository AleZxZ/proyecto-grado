const db = require('../config/db');
const { predecirCitas } = require('../services/decisionTree.service');

async function testMasivo() {
  // buscar citas FUTURAS ya agendadas (estado pendiente)
  const [citasFuturas] = await db.query(`
    SELECT c.*,
      t.nombre as tratamiento,
      s.nombre as subtratamiento,
      p.nombre as paciente_nombre,
      c.hora,
      c.sucursal_id
    FROM citas c
    JOIN subtratamientos s ON c.subtratamiento_id = s.id
    JOIN tratamientos t ON s.tratamiento_id = t.id
    JOIN pacientes p ON c.paciente_id = p.id
    WHERE c.estado = 'pendiente'
    AND c.fecha >= CURDATE()
    ORDER BY c.fecha ASC
  `);

  if (citasFuturas.length === 0) {
    console.log('No hay citas futuras pendientes para comparar');
    return;
  }

  let totalTests  = 0;
  let exactas     = 0;
  let muyBuenas   = 0;
  let aceptables  = 0;
  let incorrectas = 0;

  for (const citaReal of citasFuturas) {
    // obtener historial del paciente hasta hoy
    const [historial] = await db.query(`
      SELECT c.*,
        t.nombre as tratamiento,
        s.nombre as subtratamiento,
        c.motivo, c.hora, c.sucursal_id,
        sub.intervalo_dias
      FROM citas c
      JOIN subtratamientos s ON c.subtratamiento_id = s.id
      JOIN tratamientos t ON s.tratamiento_id = t.id
      JOIN subtratamientos sub ON c.subtratamiento_id = sub.id
      WHERE c.paciente_id = ? 
      AND c.estado = 'realizada'
      ORDER BY c.fecha ASC
    `, [citaReal.paciente_id]);

    if (historial.length < 3) continue;

    const resultado  = predecirCitas(historial, 2);
    const prediccion = resultado.predicciones[0];

    if (!prediccion) continue;

    const diff = Math.abs(
      (new Date(citaReal.fecha) - new Date(prediccion.fecha)) / 86_400_000
    );

    totalTests++;
    if (diff === 0)       exactas++;
    else if (diff <= 2)   muyBuenas++;
    else if (diff <= 5)   aceptables++;
    else                  incorrectas++;

    console.log(`Paciente ${citaReal.paciente_id}: real=${citaReal.fecha} predicha=${prediccion.fecha} diff=${Math.round(diff)} días`);
  }

  console.log('\n═══ RESULTADOS FINALES ═══');
  console.log(`Total citas testeadas:     ${totalTests}`);
  console.log(`✅ Exactas (0 días):        ${exactas}   (${pct(exactas, totalTests)}%)`);
  console.log(`✅ Muy buenas (±2 días):    ${muyBuenas} (${pct(muyBuenas, totalTests)}%)`);
  console.log(`⚠️  Aceptables (±5 días):   ${aceptables} (${pct(aceptables, totalTests)}%)`);
  console.log(`❌ Incorrectas (>5 días):   ${incorrectas} (${pct(incorrectas, totalTools)}%)`);
  console.log(`\nPrecisión total: ${pct(exactas + muyBuenas + aceptables, totalTests)}%`);
}

function pct(valor, total) {
  return total === 0 ? 0 : Math.round((valor / total) * 100);
}

testMasivo();