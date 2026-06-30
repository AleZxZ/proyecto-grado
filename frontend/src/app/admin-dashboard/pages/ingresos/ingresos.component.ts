import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-ingresos',
  imports: [CommonModule, FormsModule],
  templateUrl: './ingresos.component.html',
  styleUrl: './ingresos.component.css'
})
export class IngresosComponent implements OnInit {
  // ── Navegación mes ────────────────────────────────────────────────────────
  mesActual   = new Date().getMonth() + 1;
  anioActual  = new Date().getFullYear();
  sucursal    = 0; // 0 = todas

  // ── Datos ─────────────────────────────────────────────────────────────────
  cargando       = false;
  ingresos:      any[] = [];
  gastos:        any[] = [];
  gastosFiltrados: any[] = [];
  citasPendientes: any[] = [];

  // ── Modal gasto ───────────────────────────────────────────────────────────
  modalGastoVisible = false;
  guardandoGasto    = false;
  errorGasto        = '';
  exitoGasto        = '';

  // variables
  modalReporteVisible = false;
  generandoPDF        = false;
  reporteDesde        = '';
  reporteHasta        = new Date().toISOString().split('T')[0];
  datosReporte:  any  = null;
  cargandoReporte     = false;

  formGasto = {
    concepto:    '',
    monto:       null as number | null,
    categoria:   'otros',
    sucursal_id: 1,  // ← agregar
    fecha:       new Date().toISOString().split('T')[0],
    notas:       '',
  };

  readonly CATEGORIAS = [
    { value: 'material',   label: 'Material' },
    { value: 'servicios',  label: 'Servicios' },
    { value: 'equipo',     label: 'Equipo' },
    { value: 'personal',   label: 'Personal' },
    { value: 'otros',      label: 'Otros' },
  ];

  readonly MESES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  sucursalUsuario: number | null = null;
  constructor(private svc: CitasService, private auth: AuthService) {}

  ngOnInit(): void {
    this.sucursalUsuario = this.auth.getSucursalId();

    // si tiene sucursal asignada preseleccionarla
    if (this.sucursalUsuario) {
      this.sucursal = this.sucursalUsuario;
    }

    this.cargarTodo();
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  mesAnterior(): void {
    if (this.mesActual === 1) {
      this.mesActual  = 12;
      this.anioActual--;
    } else {
      this.mesActual--;
    }
    this.cargarTodo();
  }

  mesSiguiente(): void {
    if (this.mesActual === 12) {
      this.mesActual  = 1;
      this.anioActual++;
    } else {
      this.mesActual++;
    }
    this.cargarTodo();
  }

  get mesNombre(): string {
    return this.MESES[this.mesActual - 1];
  }

  get esMesActual(): boolean {
    const hoy = new Date();
    return this.mesActual === hoy.getMonth() + 1 &&
           this.anioActual === hoy.getFullYear();
  }

  // ── Carga ─────────────────────────────────────────────────────────────────
  cargarTodo(): void {
    this.cargando = true;
    this.svc.getIngresosMes(this.mesActual, this.anioActual, this.sucursal).subscribe({
      next: res => {
        // console.log('INGRESOS:', res); // ← agrega esto
        this.ingresos        = res.ingresos;
        this.gastos          = res.gastos;
        this.gastosFiltrados = res.gastos;
        this.citasPendientes = res.citasPendientes;
        this.cargando        = false;
      },
      error: (err) => { 
         // console.log('ERROR:', err); // ← agrega esto
        this.cargando = false; }
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  get totalIngresos(): number {
    return this.ingresos.reduce((acc, i) => acc + Number(i.monto), 0);
  }

  get totalGastos(): number {
    return this.gastos.reduce((acc, g) => acc + Number(g.monto), 0);
  }

  get capital(): number {
    return this.totalIngresos - this.totalGastos;
  }

  get proyeccionIngresos(): number {
    return this.citasPendientes.reduce(
      (acc, c) => acc + Number(c.monto_pendiente ?? 0), 0
    );
  }

  get ingresosComparacion(): number {
    return this.ingresos.reduce((acc, i) => acc + Number(i.monto), 0) -
           (this.ingresos[0]?.mes_anterior ?? 0);
  }

  // ── Semanas del mes ───────────────────────────────────────────────────────
  get semanas(): any[] {
    const semanas = [
      { label: 'Semana 1', monto: 0 },
      { label: 'Semana 2', monto: 0 },
      { label: 'Semana 3', monto: 0 },
      { label: 'Semana 4', monto: 0 },
    ];

    this.ingresos.forEach(i => {
      const dia  = new Date(i.creado_en).getDate();
      const idx  = Math.min(Math.floor((dia - 1) / 7), 3);
      semanas[idx].monto += Number(i.monto);
    });

    return semanas;
  }

  get maxSemana(): number {
    return Math.max(...this.semanas.map(s => s.monto), 1);
  }

  // ── Modal gasto ───────────────────────────────────────────────────────────
  abrirGasto(): void {
    this.modalGastoVisible = true;
    this.errorGasto        = '';
    this.exitoGasto        = '';
    this.guardandoGasto    = false;
    this.formGasto = {
      concepto:  '',
      monto:     null,
      categoria: 'otros',
      sucursal_id: 1,
      fecha:     new Date().toISOString().split('T')[0],
      notas:     '',
    };
  }

  cerrarGasto(): void {
    this.modalGastoVisible = false;
  }

  guardarGasto(): void {
    this.errorGasto = '';

    if (!this.formGasto.concepto) {
      this.errorGasto = 'El concepto es obligatorio'; return;
    }
    if (!this.formGasto.monto || this.formGasto.monto <= 0) {
      this.errorGasto = 'El monto debe ser mayor a 0'; return;
    }

    this.guardandoGasto = true;

    this.svc.crearGasto(this.formGasto).subscribe({
      next: () => {
        this.guardandoGasto = false;
        this.exitoGasto     = '✓ Gasto registrado correctamente';
        this.cargarTodo();
        setTimeout(() => this.cerrarGasto(), 1500);
      },
      error: (err) => {
        this.guardandoGasto = false;
        this.errorGasto     = err.error?.error ?? 'Error al registrar el gasto';
      }
    });
  }

  eliminarGasto(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    this.svc.eliminarGasto(id).subscribe({
      next: () => this.cargarTodo()
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  // abrir modal
  abrirReporte(): void {
    this.modalReporteVisible = true;
    this.generandoPDF        = false;
    this.datosReporte        = null;
    this.cargandoReporte     = false;

    const hace1mes = new Date();
    hace1mes.setMonth(hace1mes.getMonth() - 1);
    this.reporteDesde = hace1mes.toISOString().split('T')[0];
    this.reporteHasta = new Date().toISOString().split('T')[0];
  }

  cerrarReporte(): void {
    this.modalReporteVisible = false;
  }

  previsualizarReporte(): void {
    if (!this.reporteDesde || !this.reporteHasta) return;
    this.cargandoReporte = true;

    this.svc.getReporteIngresos(this.reporteDesde, this.reporteHasta).subscribe({
      next: d => {
        this.datosReporte    = d;
        this.cargandoReporte = false;
      },
      error: () => { this.cargandoReporte = false; }
    });
  }

  get capitalReporte(): number {
    if (!this.datosReporte) return 0;
    return this.datosReporte.totalIngresos - this.datosReporte.totalGastos;
  }

  getDiffPorc(actual: number, anterior: number): string {
    if (anterior === 0) return '+100%';
    const diff = ((actual - anterior) / anterior * 100).toFixed(1);
    return Number(diff) >= 0 ? `+${diff}%` : `${diff}%`;
  }

  getDiffColor(actual: number, anterior: number): string {
    return actual >= anterior ? '#22C55E' : '#EF4444';
  }

  getCategoriaLabel(cat: string): string {
    const cats: Record<string, string> = {
      material:  'Material',
      servicios: 'Servicios',
      equipo:    'Equipo',
      personal:  'Personal',
      otros:     'Otros',
    };
    return cats[cat] ?? cat;
  }

/*********** */

  exportarPDF(): void {
    if (!this.datosReporte) return;
    this.generandoPDF = true;

    setTimeout(() => {
      try {
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
        pdf.text('Reporte de Ingresos', 14, 16);
        pdf.text(
          `Período: ${this.reporteDesde} — ${this.reporteHasta}`,
          W - 14, 10, { align: 'right' }
        );
        pdf.text(
          `Generado: ${new Date().toLocaleDateString('es-BO')}`,
          W - 14, 16, { align: 'right' }
        );
        y = 30;

        // STATS
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 40, 48);
        pdf.text('RESUMEN DEL PERÍODO', 14, y);
        y += 6;

        const stats = [
          {
            label:    'Total ingresos',
            valor:    `Bs ${this.datosReporte.totalIngresos}`,
            anterior: this.datosReporte.periodoAnterior.totalIngresos,
            actual:   this.datosReporte.totalIngresos,
            color:    [0, 188, 212] as [number, number, number]
          },
          {
            label:    'Total gastos',
            valor:    `Bs ${this.datosReporte.totalGastos}`,
            anterior: this.datosReporte.periodoAnterior.totalGastos,
            actual:   this.datosReporte.totalGastos,
            color:    [239, 68, 68] as [number, number, number]
          },
          {
            label:    'Capital neto',
            valor:    `Bs ${this.capitalReporte}`,
            anterior: this.datosReporte.periodoAnterior.totalIngresos -
                      this.datosReporte.periodoAnterior.totalGastos,
            actual:   this.capitalReporte,
            color:    this.capitalReporte >= 0
              ? [34, 197, 94] as [number, number, number]
              : [239, 68, 68] as [number, number, number]
          },
          {
            label: 'Cobros realizados',
            valor: String(this.datosReporte.ingresos.length),
            anterior: 0,
            actual:   this.datosReporte.ingresos.length,
            color:    [139, 195, 74] as [number, number, number]
          },
        ];

        const statW = (W - 28) / 4;
        stats.forEach((s, idx) => {
          const x = 14 + idx * statW;
          pdf.setFillColor(238, 244, 245);
          pdf.setDrawColor(208, 216, 220);
          pdf.roundedRect(x, y, statW - 3, 22, 2, 2, 'FD');
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(74, 104, 112);
          pdf.text(s.label, x + (statW - 3) / 2, y + 6, { align: 'center' });
          pdf.setFontSize(13);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(s.color[0], s.color[1], s.color[2]);
          pdf.text(s.valor, x + (statW - 3) / 2, y + 14, { align: 'center' });
          // comparación período anterior
          if (s.anterior !== undefined && s.anterior !== 0) {
            const diff = this.getDiffPorc(s.actual, s.anterior);
            pdf.setFontSize(6);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(s.actual >= s.anterior ? 34 : 239, s.actual >= s.anterior ? 197 : 68, s.actual >= s.anterior ? 94 : 68);
            pdf.text(`${diff} vs período anterior`, x + (statW - 3) / 2, y + 19, { align: 'center' });
          }
        });
        y += 28;

        // TABLA COBROS
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 40, 48);
        pdf.text('DETALLE DE COBROS', 14, y);
        y += 5;

        const colsCobros = [
          { label: 'Fecha',     w: 35 },
          { label: 'Paciente',  w: 60 },
          { label: 'Sucursal',  w: 45 },
          { label: 'Notas',     w: 80 },
          { label: 'Monto',     w: 30 },
        ];

        pdf.setFillColor(226, 232, 234);
        pdf.rect(14, y, W - 28, 6, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(74, 104, 112);
        let xCol = 14;
        colsCobros.forEach(col => {
          pdf.text(col.label, xCol + 1, y + 4);
          xCol += col.w;
        });
        y += 7;

        if (this.datosReporte.ingresos.length === 0) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(176, 190, 197);
          pdf.text('No hay cobros en este período', 14, y + 4);
          y += 8;
        }

        this.datosReporte.ingresos.forEach((i: any, idx: number) => {
          if (y > 185) { pdf.addPage(); y = 15; }

          if (idx % 2 === 0) {
            pdf.setFillColor(248, 249, 250);
            pdf.rect(14, y - 1, W - 28, 6, 'F');
          }

          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(22, 40, 48);

          xCol = 14;
          const valoresCobros = [
            this.formatFecha(i.creado_en),
            i.paciente_nombre,
            i.sucursal_nombre,
            i.notas ?? '—',
            `Bs ${i.monto}`,
          ];

          valoresCobros.forEach((val, vi) => {
            const maxW  = colsCobros[vi].w - 3;
            const texto = pdf.getTextWidth(val) > maxW
              ? val.substring(0, Math.floor(val.length * maxW / pdf.getTextWidth(val))) + '...'
              : val;
            if (vi === 4) {
              pdf.setTextColor(0, 188, 212);
              pdf.setFont('helvetica', 'bold');
            } else {
              pdf.setTextColor(22, 40, 48);
              pdf.setFont('helvetica', 'normal');
            }
            pdf.text(texto, xCol + 1, y + 4);
            xCol += colsCobros[vi].w;
          });

          pdf.setDrawColor(240, 244, 245);
          pdf.line(14, y + 5.5, W - 14, y + 5.5);
          y += 6.5;
        });

        y += 4;

        // TABLA GASTOS
        if (y > 160) { pdf.addPage(); y = 15; }

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 40, 48);
        pdf.text('DETALLE DE GASTOS', 14, y);
        y += 5;

        const colsGastos = [
          { label: 'Fecha',     w: 35 },
          { label: 'Concepto',  w: 80 },
          { label: 'Categoría', w: 40 },
          { label: 'Notas',     w: 75 },
          { label: 'Monto',     w: 30 },
        ];

        pdf.setFillColor(226, 232, 234);
        pdf.rect(14, y, W - 28, 6, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(74, 104, 112);
        xCol = 14;
        colsGastos.forEach(col => {
          pdf.text(col.label, xCol + 1, y + 4);
          xCol += col.w;
        });
        y += 7;

        if (this.datosReporte.gastos.length === 0) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(176, 190, 197);
          pdf.text('No hay gastos en este período', 14, y + 4);
          y += 8;
        }

        this.datosReporte.gastos.forEach((g: any, idx: number) => {
          if (y > 185) { pdf.addPage(); y = 15; }

          if (idx % 2 === 0) {
            pdf.setFillColor(248, 249, 250);
            pdf.rect(14, y - 1, W - 28, 6, 'F');
          }

          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(22, 40, 48);

          xCol = 14;
          const valoresGastos = [
            this.formatFecha(g.fecha),
            g.concepto,
            this.getCategoriaLabel(g.categoria),
            g.notas ?? '—',
            `Bs ${g.monto}`,
          ];

          valoresGastos.forEach((val, vi) => {
            const maxW  = colsGastos[vi].w - 3;
            const texto = pdf.getTextWidth(val) > maxW
              ? val.substring(0, Math.floor(val.length * maxW / pdf.getTextWidth(val))) + '...'
              : val;
            if (vi === 4) {
              pdf.setTextColor(239, 68, 68);
              pdf.setFont('helvetica', 'bold');
            } else {
              pdf.setTextColor(22, 40, 48);
              pdf.setFont('helvetica', 'normal');
            }
            pdf.text(texto, xCol + 1, y + 4);
            xCol += colsGastos[vi].w;
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
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(176, 190, 197);
          pdf.text('Clínica Dental Escobar', 14, 203);
          pdf.text(`Página ${i} de ${pageCount}`, W - 14, 203, { align: 'right' });
        }

        const url = pdf.output('bloburl');
        window.open(url, '_blank');
        this.generandoPDF        = false;
        this.modalReporteVisible = false;

      } catch (err) {
        console.error('Error PDF:', err);
        this.generandoPDF = false;
      }
    }, 300);
  }

  
}
