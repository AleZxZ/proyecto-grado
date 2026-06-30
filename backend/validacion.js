// validacion.js
// Script independiente para calcular métricas del modelo de árbol de decisión
// Ejecutar con: node validacion.js

const db = require('./config/db'); // ajusta la ruta a tu conexión MySQL
const { DecisionTreeClassifier } = require('ml-cart');

// ── Copiar los mismos codificadores de decisionTree.service.js ──────────────
const TRATAMIENTOS = [
  'Ortodoncia', 'Ortopedia dentomaxilar', 'Restauración',
  'Limpieza dental', 'Sellantes', 'Aplicación de flúor',
  'Cirugía general', 'Cirugía quirúrgica', 'Endodoncia',
];
const SUBTRATAMIENTOS = [
  'Brackets metálicos', 'Brackets estéticos', 'Autoligado',
  'Ortopedia dentomaxilar', 'Resina compuesta', 'Mantenimiento',
  'Profilaxis dental', 'Sellantes de fosas', 'Flúor tópico',
  'Extracción + puntos', 'Control post-op', 'Quita de puntos',
  'Sesión de endodoncia', 'Resina compuesta Suc2', 'Mantenimiento Suc2',
  'Profilaxis dental Suc2', 'Sellantes de fosas Suc2', 'Flúor tópico Suc2',
];
const MOTIVOS = [
  'Colocación brackets metálicos','Ajuste de brackets','Colocación autoligado',
  'Colocación brackets estéticos','Colocación aparato ortopédico','Control ortopédico',
  'Restauración caries molar','Control de sensibilidad','Restauración premolar',
  'Mantenimiento anual restauraciones','Limpieza semestral','Sellantes primera aplicación',
  'Renovación de sellantes','Aplicación de flúor','Extracción molar inferior',
  'Quita de puntos','Extracción tercer molar','Diagnóstico y apertura',
  'Sesión de endodoncia','Obturación definitiva','Limpieza semestral post endodoncia',
  'Control semestral','Cirugía implante dental','Control post operatorio',
  'Apertura cámara pulpar','Restauración post endodoncia','Extracción molar',
  'Diagnóstico molar','Obturación','Restauración resina','Apertura y diagnóstico',
  'Restauración corona','Extracción quirúrgica retenida','Diagnóstico absceso',
  'Diagnóstico dolor crónico','Restauración','Implante dental zona 36',
  'Implante zona 46','Cirugía implante zona 16','Diagnóstico',
  'Evaluación y colocación aparato','Restauración caries molar derecho','Mantenimiento anual',
];

const encodeTrat    = n => { const i = TRATAMIENTOS.indexOf(n);    return i >= 0 ? i : TRATAMIENTOS.length; };
const encodeSubtrat = n => { const i = SUBTRATAMIENTOS.indexOf(n); return i >= 0 ? i : SUBTRATAMIENTOS.length; };
const encodeMotivo  = m => { const i = MOTIVOS.indexOf(m);         return i >= 0 ? i : MOTIVOS.length; };

// ── Traer TODAS las citas realizadas de todos los pacientes ──────────────────
async function obtenerTodasLasCitas() {
  const [rows] = await db.query(`
    SELECT c.fecha, c.hora, c.motivo,
           t.nombre  AS tratamiento,
           st.nombre AS subtratamiento,
           st.intervalo_dias,
           s.id      AS sucursal_id,
           c.paciente_id
    FROM citas c
    JOIN tratamientos    t  ON t.id  = c.tratamiento_id
    JOIN subtratamientos st ON st.id = c.subtratamiento_id
    JOIN sucursales      s  ON s.id  = c.sucursal_id
    WHERE c.estado = 'realizada'
    ORDER BY c.fecha ASC
  `);
  return rows;
}

// ── Construir dataset X, y igual que en tu service ───────────────────────────
function buildDataset(citas) {
  const X = [], y = [];
  for (let i = 1; i < citas.length; i++) {
    const prev = citas[i - 1];
    const curr = citas[i];
    const intervalo = Math.round(
      (new Date(curr.fecha) - new Date(prev.fecha)) / 86_400_000
    );
    if (intervalo <= 0) continue;

    const horaNum = parseInt(String(curr.hora).slice(0, 2), 10);
    const diaSem  = new Date(curr.fecha).getDay();

    X.push([
      encodeTrat(curr.tratamiento),
      encodeSubtrat(curr.subtratamiento),
      Math.min(intervalo, 730),
      horaNum,
      diaSem,
      curr.sucursal_id,
    ]);
    y.push(encodeMotivo(curr.motivo));
  }
  return { X, y };
}

// ── Métricas ─────────────────────────────────────────────────────────────────
function calcularMetricas(yReal, yPred) {
  const clases = [...new Set([...yReal, ...yPred])];
  let aciertos = 0;
  const f1PorClase = [];
  const soportePorClase = [];

  for (const c of clases) {
    const tp = yReal.filter((v, i) => v === c && yPred[i] === c).length;
    const fp = yReal.filter((v, i) => v !== c && yPred[i] === c).length;
    const fn = yReal.filter((v, i) => v === c && yPred[i] !== c).length;
    const soporte = yReal.filter(v => v === c).length;

    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall    = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1        = precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall);

    f1PorClase.push(f1);
    soportePorClase.push(soporte);
    aciertos += tp;
  }

  const accuracy    = aciertos / yReal.length;
  const totalSop    = soportePorClase.reduce((a, b) => a + b, 0);
  const f1Weighted  = f1PorClase.reduce((s, f, i) => s + f * (soportePorClase[i] / totalSop), 0);
  const f1Macro     = f1PorClase.reduce((a, b) => a + b, 0) / clases.length;

  return { accuracy, f1Weighted, f1Macro, totalPredicciones: yReal.length };
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Obteniendo citas de la base de datos...');
  const todasLasCitas = await obtenerTodasLasCitas();
  console.log(`Total de citas realizadas encontradas: ${todasLasCitas.length}`);

  // Split 80/20
  const corte     = Math.floor(todasLasCitas.length * 0.8);
  const citasTrain = todasLasCitas.slice(0, corte);
  const citasTest  = todasLasCitas.slice(corte);

  console.log(`\nEntrenamiento: ${citasTrain.length} citas (80%)`);
  console.log(`Prueba:        ${citasTest.length} citas (20%)`);

  // Entrenar con el 80%
  const { X: XTrain, y: yTrain } = buildDataset(citasTrain);
  const tree = new DecisionTreeClassifier({ maxDepth: 5, minNumSamples: 1 });
  tree.train(XTrain, yTrain);
  console.log('\nModelo entrenado correctamente.');

  // Predecir el 20% y comparar
  const { X: XTest, y: yReal } = buildDataset(citasTest);

  if (XTest.length === 0) {
    console.log('No hay suficientes datos en el conjunto de prueba.');
    process.exit(0);
  }

  const yPred = tree.predict(XTest);

  // Resultados
  const { accuracy, f1Weighted, f1Macro, totalPredicciones } = calcularMetricas(yReal, yPred);

  console.log('\n════════════════════════════════════════');
  console.log('        RESULTADOS DE VALIDACIÓN        ');
  console.log('════════════════════════════════════════');
  console.log(`Total predicciones evaluadas : ${totalPredicciones}`);
  console.log(`Accuracy                     : ${(accuracy   * 100).toFixed(2)}%`);
  console.log(`F1-Score weighted            : ${(f1Weighted * 100).toFixed(2)}%`);
 // console.log(`F1-Score macro               : ${(f1Macro    * 100).toFixed(2)}%`);
  console.log('════════════════════════════════════════');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });