import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../services/citas.service';
import { OrtodonciaComponent } from './ortodoncia/ortodoncia.component';
import jsPDF from 'jspdf';
import { LucideAngularModule } from "lucide-angular";

@Component({
  selector: 'app-odontograma',
  imports: [CommonModule, FormsModule, OrtodonciaComponent, LucideAngularModule],
  templateUrl: './odontograma.component.html',
  styleUrl: './odontograma.component.css'
})
export class OdontogramaComponent implements OnInit {

  // ── Pacientes ─────────────────────────────────────────────────────────────
  pacientes:            any[] = [];
  pacientesFiltrados:   any[] = [];
  busqueda              = '';
  pacienteSeleccionado: any   = null;
  odontograma:          any[] = [];
  cargando              = false;

  // ── Ortodoncia ────────────────────────────────────────────────────────────
  modalOrtodonciaVisible = false;
  abrirOrtodoncia(): void  { this.modalOrtodonciaVisible = true;  }
  cerrarOrtodoncia(): void { this.modalOrtodonciaVisible = false; }

  // ── Constantes ────────────────────────────────────────────────────────────
  readonly SUPERIOR_DERECHO   = [18,17,16,15,14,13,12,11];
  readonly SUPERIOR_IZQUIERDO = [21,22,23,24,25,26,27,28];
  readonly INFERIOR_IZQUIERDO = [31,32,33,34,35,36,37,38];
  readonly INFERIOR_DERECHO   = [41,42,43,44,45,46,47,48];
  readonly CARAS = ['vestibular','oclusal','mesial','distal','palatino'];

  readonly COLORES: Record<string, string> = {
    sano:       '#ffffff',
    caries:     '#EF4444',
    restaurado: '#3B82F6',
    endodoncia: '#F97316',
    corona:     '#EAB308',
    sellante:   '#22C55E',
    fluor:      '#00BCD4',
    extraccion: '#1F2937',
    otro:       '#9CA3AF',
  };

  readonly ESTADOS = [
    { value: 'sano',       label: 'Sano'       },
    { value: 'caries',     label: 'Caries'     },
    { value: 'restaurado', label: 'Restaurado' },
    { value: 'endodoncia', label: 'Endodoncia' },
    { value: 'corona',     label: 'Corona'     },
    { value: 'sellante',   label: 'Sellante'   },
    { value: 'fluor',      label: 'Flúor'      },
    { value: 'extraccion', label: 'Extracción' },
    { value: 'otro',       label: 'Otro'       },
  ];

  // ── Modal cara ────────────────────────────────────────────────────────────
  modalVisible   = false;
  dienteActual   = 0;
  caraActual     = '';
  guardando      = false;
  errorModal     = '';
  exitoModal     = '';
  historialCara: any[] = [];
  vistaHistorial = false;
  pagoPorCuotas  = false;
  errorMontos    = '';

  tratamientos:    any[] = [];
  subtraFiltrados: any[] = [];

  formCara = {
    estado:            'sano',
    tratamiento_id:    null as number | null,
    subtratamiento_id: null as number | null,
    notas:             '',
    monto_total:       null as number | null,
    monto_pagado:      null as number | null,
  };

  // ── Historial clínico ─────────────────────────────────────────────────────
  modalHistorialVisible     = false;
  historialClinico:   any[] = [];
  historialClinicoFiltrado: any[] = [];
  cargandoHistorial         = false;
  filtroHistorial           = '';
  filtroEstadoHistorial     = '';
  eliminandoRegistro: number | null = null;

  // ── Modal editar registro ─────────────────────────────────────────────────
  modalEditarRegistroVisible = false;
  registroSeleccionado: any  = null;
  guardandoEdicion           = false;
  errorEdicion               = '';
  exitoEdicion               = '';
  tratamientosEditar:    any[] = [];
  subtraFiltradosEditar: any[] = [];

  formEditarRegistro = {
    estado:            '',
    tratamiento_id:    null as number | null,
    subtratamiento_id: null as number | null,
    notas:             '',
  };

  // ── Modal imprimir ────────────────────────────────────────────────────────
  modalImprimirVisible  = false;
  generandoPDF          = false;
  sucursalImprimir      = 1;
  fechaDesde            = '';
  fechaHasta            = new Date().toISOString().split('T')[0];
  historialFiltradoPDF: any[] = [];

  constructor(private svc: CitasService) {}

  ngOnInit(): void { this.cargarPacientes(); }

  // ── Pacientes ─────────────────────────────────────────────────────────────
  cargarPacientes(): void {
    this.svc.getPacientes().subscribe({
      next: p => { this.pacientes = p; this.pacientesFiltrados = p; }
    });
  }

  filtrar(): void {
  const q = this.busqueda.toLowerCase().trim();
  this.pacientesFiltrados = !q
    ? this.pacientes
    : this.pacientes.filter(p =>
        p.nombre.toLowerCase().includes(q) 
      );
}

  seleccionarPaciente(p: any): void {
    this.pacienteSeleccionado     = p;
    this.busqueda                 = p.nombre;
    this.pacientesFiltrados       = [];
    this.historialClinico         = [];
    this.historialClinicoFiltrado = [];
    this.historialFiltradoPDF     = [];
    this.cargarOdontograma(p.id);
  }

  limpiarPaciente(): void {
    this.pacienteSeleccionado = null;
    this.busqueda             = '';
    this.odontograma          = [];
    this.pacientesFiltrados   = [];
  }

  cargarOdontograma(pacienteId: number): void {
    this.cargando = true;
    this.svc.getOdontograma(pacienteId).subscribe({
      next: data => { this.odontograma = data; this.cargando = false; },
      error: ()   => { this.cargando = false; }
    });
  }

  // ── Helpers diente ────────────────────────────────────────────────────────
  getCaraData(diente: number, cara: string): any {
    return this.odontograma.find(o => o.diente === diente && o.cara === cara);
  }

  getCaraColor(diente: number, cara: string): string {
    const data = this.getCaraData(diente, cara);
    if (!data) return this.COLORES['sano'];
    return this.COLORES[data.estado] ?? this.COLORES['otro'];
  }

  getCaraEstado(diente: number, cara: string): string {
    return this.getCaraData(diente, cara)?.estado ?? 'sano';
  }

  isDienteExtraido(diente: number): boolean {
    return this.CARAS.every(c => this.getCaraEstado(diente, c) === 'extraccion');
  }

  isDienteCompleto(diente: number): boolean {
    return this.CARAS.every(c => {
      const estado = this.getCaraEstado(diente, c);
      return estado === 'corona' || estado === 'sellante';
    });
  }

  isDienteDeshabilitado(diente: number): boolean {
    return this.isDienteExtraido(diente);
  }

  get dientesSuperiores(): number[] {
    return [...this.SUPERIOR_DERECHO, ...this.SUPERIOR_IZQUIERDO];
  }

  get dientesInferiores(): number[] {
    return [...this.INFERIOR_IZQUIERDO, ...this.INFERIOR_DERECHO];
  }

  // ── Helpers generales ─────────────────────────────────────────────────────
  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getSucursalNombre(id: number): string {
    return id === 1 ? 'Sucursal Centro' : 'Sucursal Este';
  }

  getTratamientosUnicos(): any[] {
    const EXCLUIR = ['Ortodoncia'];
    const vistos = new Set();
    return this.tratamientos.filter(t => {
      if (EXCLUIR.includes(t.tratamiento)) return false;
      if (vistos.has(t.tratamiento_id)) return false;
      vistos.add(t.tratamiento_id);
      return true;
    });
  }

  getTratamientosUnicosEditar(): any[] {
    const EXCLUIR = ['Ortodoncia'];
    const vistos = new Set();
    return this.tratamientosEditar.filter(t => {
      if (EXCLUIR.includes(t.tratamiento)) return false;
      if (vistos.has(t.tratamiento_id)) return false;
      vistos.add(t.tratamiento_id);
      return true;
    });
  }

  // ── Modal cara ────────────────────────────────────────────────────────────
  abrirModal(diente: number, cara: string): void {
    if (!this.pacienteSeleccionado) return;
    if (this.isDienteDeshabilitado(diente)) return;

    this.dienteActual    = diente;
    this.caraActual      = cara;
    this.modalVisible    = true;
    this.errorModal      = '';
    this.exitoModal      = '';
    this.guardando       = false;
    this.vistaHistorial  = false;
    this.historialCara   = [];
    this.pagoPorCuotas   = false;
    this.errorMontos     = '';
    this.subtraFiltrados = [];

    this.formCara = {
      estado:            'sano',
      tratamiento_id:    null,
      subtratamiento_id: null,
      notas:             '',
      monto_total:       null,
      monto_pagado:      null,
    };

    this.svc.getTratamientos(this.pacienteSeleccionado.sucursal_id).subscribe({
      next: t => this.tratamientos = t
    });

    this.svc.getHistorialCara(
      this.pacienteSeleccionado.id, diente, cara
    ).subscribe({
      next: h => this.historialCara = h
    });
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.modalVisible = false;
  }

  onTratamientoChange(tratamientoId: number): void {
    this.formCara.subtratamiento_id = null;
    this.subtraFiltrados = this.tratamientos.filter(
      (t: any) => t.tratamiento_id === tratamientoId
    );
  }

  onToggleCuotas(): void {
    this.errorMontos           = '';
    this.formCara.monto_pagado = null;
  }

  validarMontos(): void {
    this.errorMontos = '';
    const total  = Number(this.formCara.monto_total  ?? 0);
    const pagado = Number(this.formCara.monto_pagado ?? 0);

    if (total < 0)  { this.errorMontos = 'El monto total no puede ser negativo';  this.formCara.monto_total  = 0; return; }
    if (pagado < 0) { this.errorMontos = 'El monto pagado no puede ser negativo'; this.formCara.monto_pagado = 0; return; }
    if (!Number.isInteger(total))  { this.errorMontos = 'El monto total debe ser un número entero';  this.formCara.monto_total  = Math.floor(total);  return; }
    if (!Number.isInteger(pagado)) { this.errorMontos = 'El monto pagado debe ser un número entero'; this.formCara.monto_pagado = Math.floor(pagado); return; }
    if (!this.formCara.monto_total || !this.formCara.monto_pagado) return;
    if (pagado > total) { this.errorMontos = `El monto pagado (Bs ${pagado}) no puede ser mayor al total (Bs ${total})`; return; }
    if (!this.pagoPorCuotas && pagado !== total) { this.errorMontos = `En pago completo el monto pagado debe ser igual al total (Bs ${total})`; return; }
  }

  guardarCara(): void {
    this.errorModal = '';
    if (this.formCara.monto_total || this.formCara.monto_pagado) {
      this.validarMontos();
      if (this.errorMontos) return;
    }
    this.guardando = true;

    const payload = {
      diente:            this.dienteActual,
      cara:              this.caraActual,
      estado:            this.formCara.estado,
      tratamiento_id:    this.formCara.tratamiento_id,
      subtratamiento_id: this.formCara.subtratamiento_id,
      notas:             this.formCara.notas,
      monto_total:       this.formCara.monto_total,
      monto_pagado:      this.formCara.monto_pagado,
    };

    this.svc.guardarCara(this.pacienteSeleccionado.id, payload).subscribe({
      next: () => {
        this.guardando             = false;
        this.exitoModal            = '✓ Guardado correctamente';
        this.formCara.monto_total  = null;
        this.formCara.monto_pagado = null;
        this.pagoPorCuotas         = false;
        this.errorMontos           = '';
        this.cargarOdontograma(this.pacienteSeleccionado.id);
        setTimeout(() => this.cerrarModal(), 1500);
      },
      error: (err) => {
        this.guardando  = false;
        this.errorModal = err.error?.error ?? 'Error al guardar';
      }
    });
  }

  // ── Historial clínico ─────────────────────────────────────────────────────
  abrirHistorialClinico(): void {
    this.modalHistorialVisible = true;
    this.filtroHistorial       = '';
    this.filtroEstadoHistorial = '';
    this.cargandoHistorial     = true;

    this.svc.getHistorialCompleto(this.pacienteSeleccionado.id).subscribe({
      next: h => {
        this.historialClinico         = this.agruparHistorial(h);
        this.historialClinicoFiltrado = this.historialClinico;
        this.cargandoHistorial        = false;
      },
      error: () => { this.cargandoHistorial = false; }
    });
  }

  cerrarHistorialClinico(): void { this.modalHistorialVisible = false; }

  filtrarHistorial(): void {
    const q = this.filtroHistorial.toLowerCase().trim();
    this.historialClinicoFiltrado = this.historialClinico.filter(h => {
      const coincideTexto = !q ||
        String(h.diente).includes(q) ||
        h.estado?.toLowerCase().includes(q) ||
        h.tratamiento?.toLowerCase().includes(q) ||
        h.subtratamiento?.toLowerCase().includes(q) ||
        h.cara?.toLowerCase().includes(q);
      const coincideEstado = !this.filtroEstadoHistorial || h.estado === this.filtroEstadoHistorial;
      return coincideTexto && coincideEstado;
    });
  }

  agruparHistorial(historial: any[]): any[] {
    const grupos: any[]       = [];
    const procesados = new Set<number>();

    for (const h of historial) {
      if (procesados.has(h.id)) continue;

      if (h.tipo === 'diente_completo') {
        const mismaFecha = historial.filter(x =>
          x.diente            === h.diente &&
          x.tipo              === 'diente_completo' &&
          x.tratamiento_id    === h.tratamiento_id &&
          x.subtratamiento_id === h.subtratamiento_id &&
          new Date(x.creado_en).getTime() - new Date(h.creado_en).getTime() < 2000
        );
        if (mismaFecha.length === 5) {
          grupos.push({ ...h, cara: 'Todas las caras', carasAgrupadas: true });
          mismaFecha.forEach(x => procesados.add(x.id));
          continue;
        }
      }
      grupos.push(h);
      procesados.add(h.id);
    }
    return grupos;
  }

  eliminarRegistroHistorial(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    this.eliminandoRegistro = id;

    this.svc.eliminarRegistroOdontograma(this.pacienteSeleccionado.id, id).subscribe({
      next: () => {
        this.eliminandoRegistro       = null;
        this.historialClinico         = this.historialClinico.filter(h => h.id !== id);
        this.historialClinicoFiltrado = this.historialClinicoFiltrado.filter(h => h.id !== id);
        this.cargarOdontograma(this.pacienteSeleccionado.id);
      },
      error: () => { this.eliminandoRegistro = null; }
    });
  }

  // ── Modal editar registro ─────────────────────────────────────────────────
  abrirEditarRegistro(h: any): void {
    this.registroSeleccionado       = h;
    this.modalEditarRegistroVisible = true;
    this.errorEdicion               = '';
    this.exitoEdicion               = '';
    this.guardandoEdicion           = false;

    this.formEditarRegistro = {
      estado:            h.estado,
      tratamiento_id:    h.tratamiento_id    ?? null,
      subtratamiento_id: h.subtratamiento_id ?? null,
      notas:             h.notas             ?? '',
    };

    this.svc.getTratamientos(this.pacienteSeleccionado.sucursal_id).subscribe({
      next: t => {
        this.tratamientosEditar = t;
        if (this.formEditarRegistro.tratamiento_id) {
          this.subtraFiltradosEditar = t.filter(
            (x: any) => x.tratamiento_id === this.formEditarRegistro.tratamiento_id
          );
        }
      }
    });
  }

  cerrarEditarRegistro(): void {
    this.modalEditarRegistroVisible = false;
    this.registroSeleccionado       = null;
  }

  onTratamientoChangeEditar(tratamientoId: number): void {
    this.formEditarRegistro.subtratamiento_id = null;
    this.subtraFiltradosEditar = this.tratamientosEditar.filter(
      (t: any) => t.tratamiento_id === tratamientoId
    );
  }

  guardarEdicionRegistro(): void {
    this.errorEdicion     = '';
    this.guardandoEdicion = true;

    this.svc.editarRegistroOdontograma(
      this.registroSeleccionado.id,
      this.formEditarRegistro
    ).subscribe({
      next: () => {
        this.guardandoEdicion = false;
        this.exitoEdicion     = '✓ Registro actualizado correctamente';
        this.cargarOdontograma(this.pacienteSeleccionado.id);
        this.svc.getHistorialCompleto(this.pacienteSeleccionado.id).subscribe({
          next: h => {
            this.historialClinico         = this.agruparHistorial(h);
            this.historialClinicoFiltrado = this.historialClinico;
          }
        });
        this.abrirHistorialClinico();
        setTimeout(() => this.cerrarEditarRegistro(), 1500);
      },
      error: (err) => {
        this.guardandoEdicion = false;
        this.errorEdicion     = err.error?.error ?? 'Error al actualizar';
      }
    });
  }

  // ── Modal imprimir ────────────────────────────────────────────────────────
  abrirModalImprimir(): void {
    this.modalImprimirVisible = true;
    this.generandoPDF         = false;
    this.sucursalImprimir     = this.pacienteSeleccionado.sucursal_id ?? 1;

    const hace1mes = new Date();
    hace1mes.setMonth(hace1mes.getMonth() - 1);
    this.fechaDesde = hace1mes.toISOString().split('T')[0];
    this.fechaHasta = new Date().toISOString().split('T')[0];

    this.historialClinico = [];
    this.svc.getHistorialCompleto(this.pacienteSeleccionado.id).subscribe({
      next: h => { this.historialClinico = this.agruparHistorial(h); }
    });
  }

  cerrarModalImprimir(): void { this.modalImprimirVisible = false; }

  // ── PDF helper ────────────────────────────────────────────────────────────
  private hexToRgb(hex: string): number[] {
    return [
      parseInt(hex.slice(1,3),16),
      parseInt(hex.slice(3,5),16),
      parseInt(hex.slice(5,7),16),
    ];
  }

  private construirPDF(historial: any[], etiquetaRango: string): void {
    const pdf = new jsPDF('l', 'mm', 'letter');
    const W   = pdf.internal.pageSize.getWidth();
    let   y   = 15;

    // HEADER
    pdf.setFillColor(22, 40, 48);
    pdf.rect(0, 0, W, 22, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Clínica Dental Escobar', 14, 10);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(this.getSucursalNombre(this.sucursalImprimir), 14, 16);
    pdf.text(`Historia Clínica: ${this.pacienteSeleccionado?.nombre}`, W - 14, 10, { align: 'right' });
    pdf.text(`Impreso: ${new Date().toLocaleDateString('es-BO')}`, W - 14, 16, { align: 'right' });
    y = 30;

    // ODONTOGRAMA
    pdf.setTextColor(22, 40, 48);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ODONTOGRAMA', 14, y);
    y += 6;

    const dibujarDiente = (diente: number, startX: number, startY: number) => {
      const size       = 3;
      const gap        = 0.5;
      const caras      = ['vestibular','oclusal','mesial','distal','palatino'];
      const posiciones = [
        { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 0 },
        { r: 1, c: 2 }, { r: 2, c: 1 },
      ];
      caras.forEach((cara, idx) => {
        const color = this.getCaraColor(diente, cara);
        const pos   = posiciones[idx];
        const x     = startX + pos.c * (size + gap);
        const yy    = startY + pos.r * (size + gap);
        if (color === '#ffffff' || color === 'white') {
          pdf.setFillColor(255, 255, 255);
        } else {
          try { const rgb = this.hexToRgb(color); pdf.setFillColor(rgb[0], rgb[1], rgb[2]); }
          catch { pdf.setFillColor(255, 255, 255); }
        }
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, yy, size, size, 'FD');
      });
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(74, 104, 112);
      pdf.text(String(diente), startX + size + gap / 2, startY - 1, { align: 'center' });
    };

    // Superior
    pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(74, 104, 112);
    pdf.text('MAXILAR SUPERIOR', 14, y);
    y += 4;
    const dienteW = 3 * 3 + 0.5 * 2 + 2;
    let xSup = 14;
    this.dientesSuperiores.forEach((diente, idx) => {
      if (idx === 8) xSup += 4;
      dibujarDiente(diente, xSup, y);
      xSup += dienteW;
    });
    y += 20;

    // Inferior
    pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(74, 104, 112);
    pdf.text('MAXILAR INFERIOR', 14, y);
    y += 4;
    let xInf = 14;
    this.dientesInferiores.forEach((diente, idx) => {
      if (idx === 8) xInf += 4;
      dibujarDiente(diente, xInf, y);
      xInf += dienteW;
    });
    y += 22;

    // Leyenda
    let xLeg = 14;
    this.ESTADOS.forEach(estado => {
      const color = this.COLORES[estado.value];
      try { const rgb = this.hexToRgb(color === '#ffffff' ? '#eeeeee' : color); pdf.setFillColor(rgb[0], rgb[1], rgb[2]); }
      catch { pdf.setFillColor(200, 200, 200); }
      pdf.setDrawColor(180, 180, 180);
      pdf.rect(xLeg, y - 3, 4, 4, 'FD');
      pdf.setFontSize(6); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(74, 104, 112);
      pdf.text(estado.label, xLeg + 5, y);
      xLeg += 24;
    });
    y += 8;

    // HISTORIAL
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(22, 40, 48);
    pdf.text('HISTORIAL DE TRATAMIENTOS', 14, y);
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(74, 104, 112);
    pdf.text(etiquetaRango, 14 + pdf.getTextWidth('HISTORIAL DE TRATAMIENTOS') + 34, y);
    y += 5;

    const cols = [
      { label: 'Fecha',       w: 30 },
      { label: 'Diente',      w: 15 },
      { label: 'Cara',        w: 20 },
      { label: 'Estado',      w: 22 },
      { label: 'Tratamiento', w: 55 },
      { label: 'Notas',       w: 50 },
    ];

    pdf.setFillColor(226, 232, 234);
    pdf.rect(14, y, W - 28, 6, 'F');
    pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(74, 104, 112);
    let xCol = 14;
    cols.forEach(col => { pdf.text(col.label, xCol + 1, y + 4); xCol += col.w; });
    y += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);

    if (historial.length === 0) {
      pdf.setTextColor(176, 190, 197);
      pdf.text('No hay registros en este período', 14, y + 4);
      y += 8;
    }

    historial.forEach((h, idx) => {
      if (y > 185) { pdf.addPage(); y = 15; }

      if (idx % 2 === 0) {
        pdf.setFillColor(248, 249, 250);
        pdf.rect(14, y - 1, W - 28, 6, 'F');
      }

      pdf.setTextColor(h.activo ? 22 : 150, h.activo ? 40 : 150, h.activo ? 48 : 150);
      xCol = 14;

      const valores = [
        this.formatFecha(h.creado_en),
        String(h.diente),
        h.carasAgrupadas ? '5 caras' : this.capitalize(h.cara ?? ''),
        this.capitalize(h.estado ?? ''),
        h.tratamiento
          ? (h.subtratamiento ? `${h.tratamiento} · ${h.subtratamiento}` : h.tratamiento)
          : '—',
        h.notas ?? '—',
      ];

      valores.forEach((val, i) => {
        if (i === 3) {
          const color = this.COLORES[h.estado] ?? this.COLORES['otro'];
          try {
            const rgb = this.hexToRgb(color === '#ffffff' ? '#cccccc' : color);
            pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
            pdf.circle(xCol + 2, y + 2.5, 1.5, 'F');
          } catch {}
          pdf.setTextColor(h.activo ? 22 : 150, h.activo ? 40 : 150, h.activo ? 48 : 150);
          pdf.text(val, xCol + 5, y + 4);
        } else {
          const maxW  = cols[i].w - 3;
          const texto = pdf.getTextWidth(val) > maxW
            ? val.substring(0, Math.floor(val.length * maxW / pdf.getTextWidth(val))) + '...'
            : val;
          pdf.text(texto, xCol + 1, y + 4);
        }
        xCol += cols[i].w;
      });

      pdf.setDrawColor(240, 244, 245);
      pdf.line(14, y + 5.5, W - 14, y + 5.5);
      y += 6.5;
    });

    // FOOTER
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setDrawColor(208, 216, 220);
      pdf.line(14, 198, W - 14, 198);
      pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(176, 190, 197);
      pdf.text(`Clínica Dental Escobar · ${this.getSucursalNombre(this.sucursalImprimir)}`, 14, 203);
      pdf.text(`Página ${i} de ${pageCount}`, W - 14, 203, { align: 'right' });
    }

    const url = pdf.output('bloburl');
    window.open(url, '_blank');
    this.generandoPDF         = false;
    this.modalImprimirVisible = false;
  }

  // ── Imprimir por rango ────────────────────────────────────────────────────
  generarPDF(): void {
    this.generandoPDF = true;
    this.historialFiltradoPDF = this.agruparHistorial(
      this.historialClinico.filter(h => {
        const fecha = new Date(h.creado_en);
        return fecha >= new Date(this.fechaDesde) &&
               fecha <= new Date(this.fechaHasta + 'T23:59:59');
      })
    );
    setTimeout(() => {
      try { this.construirPDF(this.historialFiltradoPDF, `${this.fechaDesde} — ${this.fechaHasta}`); }
      catch (err) { console.error('Error PDF:', err); this.generandoPDF = false; }
    }, 300);
  }

  // ── Imprimir todo ─────────────────────────────────────────────────────────
  generarPDFTodo(): void {
    this.generandoPDF         = true;
    this.historialFiltradoPDF = this.agruparHistorial(this.historialClinico);
    setTimeout(() => {
      try { this.construirPDF(this.historialFiltradoPDF, 'Historial completo'); }
      catch (err) { console.error('Error PDF:', err); this.generandoPDF = false; }
    }, 300);
  }

  // ── Historial clínico paciente ────────────────────────────────────────────
  modalFichaClinicaVisible = false;
  fichaClinica: any        = null;
  cargandoFicha            = false;

  abrirHistorialClinicoPaciente(): void {
    this.modalFichaClinicaVisible = true;
    this.cargandoFicha            = true;
    this.fichaClinica             = null;

    this.svc.getHistorialClinicoPaciente(this.pacienteSeleccionado.id).subscribe({
      next: h => {
        this.fichaClinica  = h;
        this.cargandoFicha = false;
      },
      error: () => { this.cargandoFicha = false; }
    });
  }

  cerrarFichaClinica(): void {
    this.modalFichaClinicaVisible = false;
  }
}