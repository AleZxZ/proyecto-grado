const { DecisionTreeClassifier } = require('ml-cart');
//const db = require('../config/db');

// ─── Codificadores dinámicos ──────────────────────────────────────────────────
// Se construyen desde los datos reales de las citas históricas
// en lugar de arrays hardcodeados

function buildCodificadores(citas) {
  const tratamientos   = [...new Set(citas.map(c => c.tratamiento).filter(Boolean))];
  const subtratamientos = [...new Set(citas.map(c => c.subtratamiento).filter(Boolean))];
  const motivos        = [...new Set(citas.map(c => c.motivo).filter(Boolean))];

  return {
    encodeTrat:    (v) => { const i = tratamientos.indexOf(v);   return i >= 0 ? i : tratamientos.length; },
    encodeSubtrat: (v) => { const i = subtratamientos.indexOf(v); return i >= 0 ? i : subtratamientos.length; },
    encodeMotivo:  (v) => { const i = motivos.indexOf(v);        return i >= 0 ? i : motivos.length; },
    decodeMotivo:  (i) => motivos[i] ?? 'Control periódico',
    motivos,
    tratamientos,
    subtratamientos,
  };
}

// ─── MOTIVO_A_TRATAMIENTO ahora también es dinámico ──────────────────────────
// Se infiere de las mismas citas históricas
function buildMotivoATratamiento(citas) {
  const mapa = {};
  citas.forEach(c => {
    if (c.motivo && c.tratamiento) {
      if (!mapa[c.motivo]) {
        mapa[c.motivo] = {
          tratamiento:    c.tratamiento,
          subtratamiento: c.subtratamiento ?? c.tratamiento,
        };
      }
    }
  });
  return mapa;
}

// ─── Preparar dataset para ml-cart ───────────────────────────────────────────
function buildDataset(citas, cod) {
  const X = [];
  const y = [];

  const sorted = [...citas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const intervalo = Math.round(
      (new Date(curr.fecha) - new Date(prev.fecha)) / 86_400_000
    );

    if (intervalo <= 0) continue;

    const horaNum = parseInt(String(curr.hora).slice(0, 2), 10);
    const diaSem  = new Date(curr.fecha).getDay();

    X.push([
      cod.encodeTrat(curr.tratamiento),
      cod.encodeSubtrat(curr.subtratamiento),
      Math.min(intervalo, 730),
      horaNum,
      diaSem,
      curr.sucursal_id,
    ]);

    y.push(cod.encodeMotivo(curr.motivo));
  }

  return { X, y };
}

// ─── Calcular intervalo promedio ──────────────────────────────────────────────
function calcIntervalo(citas) {
  const sorted = [...citas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const diffs  = [];

  for (let i = 1; i < sorted.length; i++) {
    const d = Math.round(
      (new Date(sorted[i].fecha) - new Date(sorted[i - 1].fecha)) / 86_400_000
    );
    if (d > 0) diffs.push(d);
  }

  if (!diffs.length) return null;
  return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
}

function moda(arr) {
  if (!arr.length) return null;
  const freq = {};
  arr.forEach(v => (freq[v] = (freq[v] || 0) + 1));
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

function calcConfianza(citas, intervaloReal, intervaloRef) {
  const sorted = [...citas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const diffs  = [];
  for (let i = 1; i < sorted.length; i++) {
    const d = Math.round(
      (new Date(sorted[i].fecha) - new Date(sorted[i - 1].fecha)) / 86_400_000
    );
    if (d > 0) diffs.push(d);
  }
  if (diffs.length < 2) return 50;

  const media = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const desv  = Math.sqrt(
    diffs.reduce((a, b) => a + (b - media) ** 2, 0) / diffs.length
  );

  let conf = desv < 5 ? 95 : desv < 10 ? 88 : desv < 20 ? 78 : desv < 40 ? 65 : 50;
  if (citas.length < 4) conf = Math.max(conf - 15, 35);

  if (intervaloRef && intervaloReal) {
    const diff = Math.abs(intervaloReal - intervaloRef) / intervaloRef;
    if (diff > 0.5) conf = Math.max(conf - 10, 30);
  }

  return conf;
}

// ─── Función principal ────────────────────────────────────────────────────────
function predecirCitas(citas, meses = 2) {
  if (!citas || citas.length < 2) return { predicciones: [], modelo: null };

  // construir codificadores dinámicos desde los datos reales
  const cod             = buildCodificadores(citas);
  const motivoATrat     = buildMotivoATratamiento(citas);
  const { X, y }        = buildDataset(citas, cod);
  let motivoPredicho    = null;

  if (X.length >= 2) {
    try {
      const tree = new DecisionTreeClassifier({ maxDepth: 5, minNumSamples: 1 });
      tree.train(X, y);

      const ultima  = [...citas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).pop();
      const horaNum = parseInt(String(ultima.hora).slice(0, 2), 10);
      const diaSem  = new Date(ultima.fecha).getDay();

      const pred = tree.predict([[
        cod.encodeTrat(ultima.tratamiento),
        cod.encodeSubtrat(ultima.subtratamiento),
        ultima.intervalo_dias || 30,
        horaNum,
        diaSem,
        ultima.sucursal_id,
      ]]);

      motivoPredicho = cod.decodeMotivo(pred[0]);
    } catch (_) {
      motivoPredicho = null;
    }
  }

  const sorted        = [...citas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const ultima        = sorted[sorted.length - 1];
  const intervaloR    = ultima.intervalo_dias;
  const intervaloC    = calcIntervalo(citas);
  const intervalo     = intervaloC ?? intervaloR ?? 30;
  const horaFrecuente = moda(citas.map(c => String(c.hora).slice(0, 5)));
  const diaFrecuente  = parseInt(moda(citas.map(c => String(new Date(c.fecha).getDay()))));

  const motivo        = motivoPredicho ?? moda(citas.map(c => c.motivo));
  const mappedTrat    = motivoATrat[motivo];
  const tratamiento   = mappedTrat?.tratamiento    ?? moda(citas.map(c => c.tratamiento));
  const subtratamiento = mappedTrat?.subtratamiento ?? moda(citas.map(c => c.subtratamiento));
  const confianza     = calcConfianza(citas, intervaloC, intervaloR);

  const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy); limite.setMonth(limite.getMonth() + meses);
  const predicciones  = [];
  const fechasUsadas  = new Set();
  let base = new Date(ultima.fecha);

  while (base <= hoy) base = new Date(base.getTime() + intervalo * 86_400_000);

  while (base <= limite) {
    let mejor     = base;
    let menorDiff = 99;

    for (let d = -3; d <= 3; d++) {
      const candidata = new Date(base.getTime() + d * 86_400_000);
      if (candidata.getDay() === diaFrecuente && candidata > hoy && candidata.getDay() !== 0) {
        const delta = Math.abs(d);
        if (delta < menorDiff) { menorDiff = delta; mejor = candidata; }
      }
    }

    if (mejor.getDay() === 0 || menorDiff === 99) {
      let candidata = new Date(base);
      while (candidata.getDay() === 0) {
        candidata = new Date(candidata.getTime() + 86_400_000);
      }
      mejor = candidata;
    }

    const fechaStr = mejor.toISOString().split('T')[0];

    if (mejor > hoy && mejor <= limite && mejor.getDay() !== 0 && !fechasUsadas.has(fechaStr)) {
      fechasUsadas.add(fechaStr);
      predicciones.push({
        fecha:           fechaStr,
        hora:            horaFrecuente,
        tratamiento,
        subtratamiento,
        motivo,
        confianza,
        sucursal_id:     ultima.sucursal_id,
        sucursal_nombre: ultima.sucursal_nombre,
        paciente_nombre: ultima.paciente_nombre,
      });
    }

    base = new Date(base.getTime() + intervalo * 86_400_000);
  }

  return {
    predicciones,
    modelo: { tratamiento, subtratamiento, intervalo, horaFrecuente, confianza },
  };
}

module.exports = { predecirCitas };