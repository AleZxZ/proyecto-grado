// src/app/components/calendar/calendar.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../services/citas.service';
import {
 CitaConfirmada, DiaCelda, MesCalendario, Paciente, Prediccion
} from '../models/cita.model';

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendar.component.css'],
})
export class CalendarioComponent implements OnInit {

   // ── Estado general ────────────────────────────────────────────────────────
  pacientes: Paciente[]               = [];
  filtroSucursal                      = 0;
  cargando                            = false;
  error                               = '';
  meses: MesCalendario[]              = [];
  todasPredicciones: Prediccion[]     = [];
  citasConfirmadasBD: CitaConfirmada[] = [];
  mesOffset                           = 0;
  mostrarPredicciones                 = true;  
  marcandoEstado: number | null = null;

  fechasBloqueadasSuc1: string[] = [];
  fechasBloqueadasSuc2: string[] = [];

  // ── Tooltip ───────────────────────────────────────────────────────────────
  tooltip: { visible: boolean; pred: Prediccion | null; x: number; y: number } =
    { visible: false, pred: null, x: 0, y: 0 };

  // ── Modal detalle día ─────────────────────────────────────────────────────
  modalDia: { visible: boolean; fecha: string; predicciones: Prediccion[]; confirmadas: CitaConfirmada[] } =
    { visible: false, fecha: '', predicciones: [], confirmadas: [] };

  // ── Modal confirmar cita ──────────────────────────────────────────────────
  modalConfirmar: { visible: boolean; pred: Prediccion | null } =
    { visible: false, pred: null };

  tratamientosDisponibles: any[] = [];
  doctoresDisponibles:     any[] = [];
  guardando      = false;
  errorConfirmar = '';
  exitoConfirmar = '';

  citasConfirmadas = new Set<string>();

  // ── Modal nueva cita con el boton "AGENDAR CITA" ──────────────────────────────────────────────────────
  modalNuevaCita: { visible: boolean } = { visible: false };
  tratamientosNuevaCita: any[] = [];
  doctoresNuevaCita:     any[] = [];
  guardandoNueva  = false;
  errorNuevaCita  = '';
  exitoNuevaCita  = '';
  disponibilidadMsg = '';
  disponibilidadOk  = true;

  eliminandoCita: number | null = null;

  busquedaPaciente   = '';
  pacientesFiltrados: any[] = [];
  get fechaMinima(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
  }

formNuevaCita: {
  paciente_id:       number | null;
  sucursal_id:       number | null;
  tratamiento_id:    number | null;
  subtratamiento_id: number | null;
  doctor_id:         number | null;
  fecha:             string;
  hora:              string;
  motivo:            string;
  notas:             string;
} = {
  paciente_id:       null,
  sucursal_id:       null,
  tratamiento_id:    null,
  subtratamiento_id: null,
  doctor_id:         null,
  fecha:             '',
  hora:              '',
  motivo:            '',
  notas:             '',
};

abrirNuevaCita(): void {
  this.modalNuevaCita  = { visible: true };
  this.errorNuevaCita  = '';
  this.exitoNuevaCita  = '';
  this.disponibilidadMsg = '';
  this.guardandoNueva  = false;
  this.formNuevaCita = {
    paciente_id: null, sucursal_id: null,
    tratamiento_id: null, subtratamiento_id: null,
    doctor_id: null, fecha: '', hora: '', motivo: '', notas: '',
  };
  this.tratamientosNuevaCita = [];
  this.doctoresNuevaCita     = [];
}

cerrarNuevaCita(): void {
  if (this.guardandoNueva) return;
  this.modalNuevaCita = { visible: false };
  this.errorNuevaCita = '';
  this.exitoNuevaCita = '';
  this.disponibilidadMsg = '';
}

onSucursalChangeNueva(sucursalId: number): void {
  this.formNuevaCita.tratamiento_id    = null;
  this.formNuevaCita.subtratamiento_id = null;
  this.formNuevaCita.doctor_id         = null;
  this.tratamientosNuevaCita           = [];
  this.doctoresNuevaCita               = [];

  if (!sucursalId) return;

  this.svc.getTratamientos(sucursalId).subscribe({
    next: t => this.tratamientosNuevaCita = t
  });

  this.svc.getDoctores(sucursalId).subscribe({
    next: d => this.doctoresNuevaCita = d
  });
}

onSubtratChangeNueva(subtratId: number): void {
  const found = this.tratamientosNuevaCita.find(t => t.subtratamiento_id === subtratId);
  if (found) this.formNuevaCita.tratamiento_id = found.tratamiento_id;
}

verificarDisponibilidad(): void {
  const { sucursal_id, fecha, hora } = this.formNuevaCita;
  if (!sucursal_id || !fecha || !hora) {
    this.disponibilidadMsg = '';
    this.disponibilidadOk  = true;
    return;
  }

  if (this.esFechaBloqueada(fecha, sucursal_id)) {
    this.disponibilidadOk  = false;
    this.disponibilidadMsg = `⚠ Esta fecha está bloqueada para esta sucursal`;
    return;
  }

  // convertir hora ingresada a minutos
  const [hInput, mInput] = hora.split(':').map(Number);
  const minutosInput = hInput * 60 + mInput;

  // verificar conflicto con margen de 15 minutos
  const conflicto = this.citasConfirmadasBD.some(c => {
    if (c.sucursal_id !== sucursal_id) return false;
    const fechaCita = typeof c.fecha === 'string' ? c.fecha.split('T')[0] : c.fecha;
    if (fechaCita !== fecha) return false;

    const [hCita, mCita] = String(c.hora).slice(0, 5).split(':').map(Number);
    const minutosCita = hCita * 60 + mCita;

    return Math.abs(minutosInput - minutosCita) < 15;
  });

  if (conflicto) {
    this.disponibilidadOk  = false;
    this.disponibilidadMsg = `⚠ Ya existe una cita dentro de los 15 minutos de ese horario`;
  } else {
    this.disponibilidadOk  = true;
    this.disponibilidadMsg = `✓ Horario disponible`;
  }
}

guardarNuevaCita(): void {
  const f = this.formNuevaCita;

  if (!f.paciente_id)       { this.errorNuevaCita = 'Seleccioná un paciente';     return; }
  if (!f.sucursal_id)       { this.errorNuevaCita = 'Seleccioná una sucursal';    return; }
  if (!f.subtratamiento_id) { this.errorNuevaCita = 'Seleccioná un tratamiento';  return; }
  if (!f.fecha)             { this.errorNuevaCita = 'Ingresá una fecha';          return; }
  if (!f.hora)              { this.errorNuevaCita = 'Ingresá una hora';           return; }

  if (!this.disponibilidadOk) {
    this.errorNuevaCita = this.disponibilidadMsg;
    return;
  }

  if (this.esFechaBloqueada(f.fecha, f.sucursal_id)) {
    this.errorNuevaCita = 'Esta fecha está bloqueada para esta sucursal'; return;
  }
  this.guardandoNueva = true;
  this.errorNuevaCita = '';

  const payload = {
    paciente_id:       f.paciente_id,
    sucursal_id:       f.sucursal_id,
    tratamiento_id:    f.tratamiento_id,
    subtratamiento_id: f.subtratamiento_id,
    doctor_id:         f.doctor_id || null,
    fecha:             f.fecha,
    hora:              f.hora,
    motivo:            f.motivo || 'Control periódico',
    notas:             f.notas || null,
  };

  this.svc.confirmarCita(payload).subscribe({
    next: () => {
      this.guardandoNueva = false;
      this.exitoNuevaCita = `✓ Cita agendada correctamente para el ${f.fecha} a las ${f.hora}`;

      // recargar calendario
      this.svc.getCalendarioTodos(2).subscribe({
        next: res => {
          this.todasPredicciones  = res.predicciones;
          this.citasConfirmadasBD = res.confirmadas;
          this.construirMeses(
            this.mostrarPredicciones ? res.predicciones : [],
            res.confirmadas
          );
        }
      });

      setTimeout(() => this.cerrarNuevaCita(), 1500);
    },
    error: (err) => {
      this.guardandoNueva = false;
      this.errorNuevaCita = err.error?.error ?? 'Error al guardar la cita.';
    }
  });
}


  claveConfirmada(pred: any): string {
    return pred.paciente_nombre + '|' + pred.fecha;
  }

  estaConfirmada(pred: any): boolean {
    return this.citasConfirmadas.has(this.claveConfirmada(pred));
  }

  formCita: {
    hora:              string;
    tratamiento_id:    number | null;
    subtratamiento_id: number | null;
    doctor_id:         number | null;
    motivo:            string;
    notas:             string;
  } = {
    hora:              '',
    tratamiento_id:    null,
    subtratamiento_id: null,
    doctor_id:         null,
    motivo:            '',
    notas:             '',
  };

  // ── Constantes ────────────────────────────────────────────────────────────
  readonly DIAS_HDR = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  readonly MESES_ES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  constructor(private svc: CitasService) {}

  ngOnInit(): void { 
    this.cargarTodo(); 
    this.cargarFechasBloqueadas();
  }

  // ── Carga principal ───────────────────────────────────────────────────────
  cargarTodo(): void {
    this.cargando = true;
    this.error    = '';

    this.svc.getPacientes().subscribe({
      next:  p  => (this.pacientes = p),
      error: () => {}
    });

    this.svc.getCalendarioTodos(2).subscribe({
      next: res => {
        this.todasPredicciones  = res.predicciones;
        this.citasConfirmadasBD = res.confirmadas;
        this.construirMeses(res.predicciones, res.confirmadas);
        this.cargando = false;
      },
      error: () => {
        this.error    = 'No se pudo conectar al servidor. Verificá que el backend esté corriendo en localhost:3000';
        this.cargando = false;
      }
    });
  }

  // ── Aplicar filtro ────────────────────────────────────────────────────────
  aplicarFiltro(): void {
    // si toggle está apagado no muestra predicciones
    const preds = !this.mostrarPredicciones
      ? []
      : this.filtroSucursal === 0
        ? this.todasPredicciones
        : this.todasPredicciones.filter(p => p.sucursal_id === this.filtroSucursal);

    const confs = this.filtroSucursal === 0
      ? this.citasConfirmadasBD
      : this.citasConfirmadasBD.filter(c => c.sucursal_id === this.filtroSucursal);

    this.construirMeses(preds, confs);
  }

  // ── Construcción del calendario ───────────────────────────────────────────
  private construirMeses(predicciones: Prediccion[], confirmadas: CitaConfirmada[] = []): void {
    const hoy = new Date();

    // calcular rango visible
    const inicioRango = new Date(hoy.getFullYear(), hoy.getMonth() + this.mesOffset, 1);
    const finRango    = new Date(hoy.getFullYear(), hoy.getMonth() + this.mesOffset + 2, 0);

    // filtrar solo predicciones dentro del rango visible
    const predsFiltradas = predicciones.filter(p => {
      const fecha = new Date(p.fecha + 'T12:00:00');
      return fecha >= inicioRango && fecha <= finRango;
    });

    // filtrar confirmadas dentro del rango visible
    const confsFiltradas = confirmadas.filter(c => {
      const fecha = new Date(c.fecha + 'T12:00:00');
      return fecha >= inicioRango && fecha <= finRango;
    });

    const predMap = new Map<string, Prediccion[]>();
    predsFiltradas.forEach(p => {
      const lista = predMap.get(p.fecha) ?? [];
      lista.push(p);
      predMap.set(p.fecha, lista);
    });

    const confMap = new Map<string, CitaConfirmada[]>();
    confsFiltradas.forEach(c => {
      const lista = confMap.get(c.fecha) ?? [];
      lista.push(c);
      confMap.set(c.fecha, lista);
    });

    this.meses = [];
    for (let offset = 0; offset < 2; offset++) {
      const ref       = new Date(hoy.getFullYear(), hoy.getMonth() + offset + this.mesOffset, 1);
      const anio      = ref.getFullYear();
      const mes       = ref.getMonth();
      const total     = new Date(anio, mes + 1, 0).getDate();
      const primerDia = new Date(anio, mes, 1).getDay();
      const celdas: DiaCelda[] = [];

      for (let i = 0; i < primerDia; i++) {
        celdas.push({ numero: null, fecha: null, esHoy: false, esPasado: false, predicciones: [], confirmadas: [] });
      }
      for (let d = 1; d <= total; d++) {
        const fechaStr = `${anio}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const diaDate  = new Date(anio, mes, d);
        celdas.push({
          numero: d, fecha: fechaStr,
          esHoy:    diaDate.toDateString() === hoy.toDateString(),
          esPasado: diaDate < hoy && diaDate.toDateString() !== hoy.toDateString(),
          predicciones: predMap.get(fechaStr) ?? [],
          confirmadas:  confMap.get(fechaStr) ?? [],
        });
      }

      const semanas: DiaCelda[][] = [];
      for (let i = 0; i < celdas.length; i += 7) {
        const s = celdas.slice(i, i + 7);
        while (s.length < 7) s.push({ numero: null, fecha: null, esHoy: false, esPasado: false, predicciones: [], confirmadas: [] });
        semanas.push(s);
      }
      this.meses.push({ anio, mes, nombre: this.MESES_ES[mes], semanas });
    }
  }

  // ── Navegación de meses ───────────────────────────────────────────────────
  mesAnterior(): void {
    if (this.mesOffset <= 0) return;
    this.mesOffset--;
    this.construirMeses(
      this.mostrarPredicciones ? this.todasPredicciones : [],
      this.citasConfirmadasBD
    );
  }

  mesSiguiente(): void {
    this.mesOffset++;
    this.construirMeses(
      this.mostrarPredicciones ? this.todasPredicciones : [],
      this.citasConfirmadasBD
    );
  }

  construirMesesPublico(): void {
    this.construirMeses(
      this.mostrarPredicciones ? this.todasPredicciones : [],
      this.citasConfirmadasBD
    );
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────
  mostrarTooltip(event: MouseEvent, pred: Prediccion): void {
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.tooltip = { visible: true, pred, x: r.left + r.width / 2, y: r.top };
  }
  ocultarTooltip(): void { this.tooltip = { ...this.tooltip, visible: false }; }

  mostrarTooltipConf(event: MouseEvent, conf: CitaConfirmada): void {
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.tooltip = {
      visible: true,
      pred: {
        fecha:           conf.fecha,
        hora:            conf.hora,
        tratamiento:     conf.tratamiento,
        subtratamiento:  conf.subtratamiento,
        motivo:          conf.motivo,
        confianza:       100,
        sucursal_id:     conf.sucursal_id,
        sucursal_nombre: conf.sucursal_nombre + ' ✓',
        paciente_nombre: conf.paciente_nombre,
      } as any,
      x: r.left + r.width / 2,
      y: r.top,
    };
  }

  // ── Modal detalle día ─────────────────────────────────────────────────────
  abrirDia(celda: DiaCelda): void {
    const tieneContenido = (celda.predicciones?.length ?? 0) > 0 || (celda.confirmadas?.length ?? 0) > 0;
    if (!tieneContenido || !celda.fecha) return;
    this.modalDia = {
      visible:      true,
      fecha:        celda.fecha,
      predicciones: celda.predicciones ?? [],
      confirmadas:  celda.confirmadas  ?? [],
    };
  }
  cerrarModal(): void { this.modalDia = { ...this.modalDia, visible: false }; }

  // ── Modal confirmar cita ──────────────────────────────────────────────────
  abrirConfirmar(pred: Prediccion): void {
    this.modalConfirmar  = { visible: true, pred };
    this.errorConfirmar  = '';
    this.exitoConfirmar  = '';
    this.guardando       = false;

    this.formCita = {
      hora:              pred.hora,
      tratamiento_id:    null,
      subtratamiento_id: null,
      doctor_id:         null,
      motivo:            pred.motivo,
      notas:             '',
    };

    this.svc.getTratamientos(pred.sucursal_id).subscribe({
      next: t => {
        this.tratamientosDisponibles = t;
        const match = t.find((x: any) => x.subtratamiento === pred.subtratamiento);
        if (match) {
          this.formCita.tratamiento_id    = match.tratamiento_id;
          this.formCita.subtratamiento_id = match.subtratamiento_id;
        }
      }
    });

    this.svc.getDoctores(pred.sucursal_id).subscribe({
      next: d => {
        this.doctoresDisponibles = d;
        if (d.length === 1) this.formCita.doctor_id = d[0].id;
      }
    });
  }

  cerrarConfirmar(): void {
    if (this.guardando) return;
    this.modalConfirmar = { visible: false, pred: null };
    this.errorConfirmar = '';
    this.exitoConfirmar = '';
  }

  onSubtratChange(subtratId: number): void {
    const found = this.tratamientosDisponibles.find(t => t.subtratamiento_id === subtratId);
    if (found) this.formCita.tratamiento_id = found.tratamiento_id;
  }

  // ── Confirmar y guardar en BD ─────────────────────────────────────────────
  confirmarCita(): void {
    const pred = this.modalConfirmar.pred;
    if (!pred) return;

    if (!this.formCita.hora) {
      this.errorConfirmar = 'La hora es obligatoria';
      return;
    }
    if (!this.formCita.subtratamiento_id) {
      this.errorConfirmar = 'Seleccioná un tratamiento';
      return;
    }
    if (this.esFechaBloqueada(pred.fecha, pred.sucursal_id)) {
      this.errorConfirmar = 'Esta fecha está bloqueada para esta sucursal';
      return;
    }
    const paciente = this.pacientes.find(p => p.nombre === pred.paciente_nombre);
    if (!paciente) {
      this.errorConfirmar = 'No se encontró el paciente en el sistema';
      return;
    }

    this.guardando      = true;
    this.errorConfirmar = '';

    const payload = {
      paciente_id:       paciente.id,
      sucursal_id:       pred.sucursal_id,
      tratamiento_id:    this.formCita.tratamiento_id,
      subtratamiento_id: this.formCita.subtratamiento_id,
      doctor_id:         this.formCita.doctor_id || null,
      fecha:             pred.fecha,
      hora:              this.formCita.hora,
      motivo:            this.formCita.motivo || pred.motivo,
      notas:             this.formCita.notas || null,
    };

    this.svc.confirmarCita(payload).subscribe({
      next: () => {
        this.guardando      = false;
        this.exitoConfirmar = `✓ Cita agendada para ${pred.paciente_nombre} el ${pred.fecha} a las ${this.formCita.hora}`;

        this.svc.getCalendarioTodos(2).subscribe({
          next: res => {
            this.todasPredicciones  = res.predicciones;
            this.citasConfirmadasBD = res.confirmadas;
            this.construirMeses(
              this.mostrarPredicciones ? res.predicciones : [],
              res.confirmadas
            );
          }
        });

        setTimeout(() => {
          this.cerrarConfirmar();
          this.cerrarModal();
        }, 1500);
      },
      error: (err) => {
        this.guardando      = false;
        this.errorConfirmar = err.error?.error ?? 'Error al guardar la cita. Intentá de nuevo.';
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  get totalPredicciones() { return this.todasPredicciones.length + this.citasConfirmadasBD.length; }
  get totalConfirmadas()  { return this.citasConfirmadasBD.length; }
  get totalSuc1()         { return this.todasPredicciones.filter(p => p.sucursal_id === 1).length; }
  get totalSuc2()         { return this.todasPredicciones.filter(p => p.sucursal_id === 2).length; }

  maxVisibles(preds: Prediccion[]) { return preds.slice(0, 3); }
  extraCount(preds: Prediccion[])  { return Math.max(0, preds.length - 3); }

  formatFecha(f: string): string {
    const d = new Date(f + 'T12:00:00');
    return `${this.DIAS_HDR[d.getDay()]} ${d.getDate()} de ${this.MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
  }

  eliminarCita(id: number, event: Event): void {
    event.stopPropagation();

    if (!confirm('¿Estás seguro de eliminar esta cita?')) return;

    this.eliminandoCita = id;

    this.svc.eliminarCita(id).subscribe({
      next: () => {
        this.eliminandoCita = null;

        // recargar calendario
        this.svc.getCalendarioTodos(2).subscribe({
          next: res => {
            this.todasPredicciones  = res.predicciones;
            this.citasConfirmadasBD = res.confirmadas;
            this.construirMeses(
              this.mostrarPredicciones ? res.predicciones : [],
              res.confirmadas
            );
            // actualizar el modal del día
            const fechaModal = this.modalDia.fecha;
            const celda = this.meses
              .flatMap(m => m.semanas)
              .flatMap(s => s)
              .find(c => c.fecha === fechaModal);

            if (celda) {
              this.modalDia.confirmadas  = celda.confirmadas ?? [];
              this.modalDia.predicciones = celda.predicciones ?? [];
            }

            // cerrar modal si ya no hay citas ese día
            if (this.modalDia.confirmadas.length === 0 && this.modalDia.predicciones.length === 0) {
              this.cerrarModal();
            }
          }
        });
      },
      error: (err) => {
        this.eliminandoCita = null;
        alert(err.error?.error ?? 'Error al eliminar la cita');
      }
    });
  }

  marcarEstadoCita(id: number, estado: string, event: Event): void {
    event.stopPropagation();
    if (estado === 'cancelada' && !confirm('¿Cancelar esta cita?')) return;

    this.marcandoEstado = id;
    this.svc.cambiarEstadoCita(id, estado).subscribe({
      next: () => {
        this.marcandoEstado = null;
        // recargar el calendario
        this.cargarTodo();
        this.cerrarModal();
      },
      error: () => { this.marcandoEstado = null; }
    });
  }

  cargarFechasBloqueadas(): void {
    this.svc.getFechasBloqueadasPorSucursal(1).subscribe({
      next: f => this.fechasBloqueadasSuc1 = f.map((x: any) =>
        typeof x.fecha === 'string' ? x.fecha.split('T')[0] : x.fecha)
    });
    this.svc.getFechasBloqueadasPorSucursal(2).subscribe({
      next: f => this.fechasBloqueadasSuc2 = f.map((x: any) =>
        typeof x.fecha === 'string' ? x.fecha.split('T')[0] : x.fecha)
    });
  }

  esFechaBloqueada(fecha: string, sucursalId: number): boolean {
    const lista = sucursalId === 1 ? this.fechasBloqueadasSuc1 : this.fechasBloqueadasSuc2;
    return lista.includes(fecha);
  }

  filtrarPacientes(): void {
    const q = this.busquedaPaciente.toLowerCase().trim();
    this.pacientesFiltrados = !q
      ? []
      : this.pacientes.filter(p =>
          p.nombre.toLowerCase().includes(q)
        ).slice(0, 8); // máximo 8 resultados
  }

  seleccionarPaciente(p: any): void {
    this.formNuevaCita.paciente_id = p.id;
    this.busquedaPaciente          = p.nombre;
    this.pacientesFiltrados        = [];
  }
}
