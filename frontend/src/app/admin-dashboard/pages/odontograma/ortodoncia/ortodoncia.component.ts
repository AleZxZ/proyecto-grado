import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit  } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../../services/citas.service';
import jsPDF from 'jspdf';


@Component({
  selector: 'app-ortodoncia',
  imports: [CommonModule,FormsModule],
  templateUrl: './ortodoncia.component.html',
  styleUrl: './ortodoncia.component.css'
})
export class OrtodonciaComponent {
  @Input() paciente: any = null;
  @Output() cerrar = new EventEmitter<void>();

  // ── Estado ────────────────────────────────────────────────────────────────
  cargando      = false;
  guardando     = false;
  planActivo:   any = null;
  sesiones:     any[] = [];
  pagos:        any = null;
  vista         = 'crear'; // 'crear' | 'ver'
  tabActiva     = 'sesion'; // 'sesion' | 'historial' | 'pagos'

  // ── Formulario crear plan ─────────────────────────────────────────────────
  errorCrear  = '';
  exitoCrear  = '';

  formPlan = {
    tipo_bracket:  '',
    precio_total:  null as number | null,
    cuota_inicial: null as number | null,
    observaciones: '',
  };

  readonly BRACKETS = [
    { value: 'metalico',   label: 'Brackets metálicos' },
    { value: 'estetico',   label: 'Brackets estéticos' },
    { value: 'autoligado', label: 'Autoligado' },
  ];

  // ── Formulario sesión ─────────────────────────────────────────────────────
  errorSesion  = '';
  exitoSesion  = '';

  formSesion = {
    dientes_sesion: [] as number[],
    observaciones:  '',
    cuota_pagada:   null as number | null,
  };

  dienteSeleccionado: number | null = null; // para selección por rango
  rangoInicio: number | null = null;

  // ── Numeración FDI ────────────────────────────────────────────────────────
  readonly SUPERIOR_DERECHO   = [18,17,16,15,14,13,12,11];
  readonly SUPERIOR_IZQUIERDO = [21,22,23,24,25,26,27,28];
  readonly INFERIOR_IZQUIERDO = [31,32,33,34,35,36,37,38];
  readonly INFERIOR_DERECHO   = [41,42,43,44,45,46,47,48];

  constructor(private svc: CitasService) {}

  ngOnInit(): void { this.cargarPlan(); }

  // ── Carga ─────────────────────────────────────────────────────────────────
  cargarPlan(): void {
    if (!this.paciente) return;
    this.cargando = true;
    this.svc.getPlanOrtodoncia(this.paciente.id).subscribe({
      next: res => {
        this.cargando = false;
        if (res) {
          this.planActivo     = res.plan;
          this.sesiones       = res.sesiones;
          this.pagos          = res.pagos;
          this.vista          = 'ver';
        } else {
          this.vista = 'crear';
        }
      },
      error: () => { this.cargando = false; }
    });
  }

  // ── Crear plan ────────────────────────────────────────────────────────────
  crearPlan(): void {
    this.errorCrear = '';

    if (!this.formPlan.tipo_bracket)  { this.errorCrear = 'Selecciona el tipo de bracket'; return; }
    if (!this.formPlan.precio_total)  { this.errorCrear = 'El precio total es obligatorio'; return; }
    if (this.formPlan.precio_total <= 0) { this.errorCrear = 'El precio debe ser mayor a 0'; return; }
    if (this.formPlan.cuota_inicial && this.formPlan.cuota_inicial < 0) {
      this.errorCrear = 'La cuota inicial no puede ser negativa'; return;
    }
    if (this.formPlan.cuota_inicial && this.formPlan.cuota_inicial > this.formPlan.precio_total) {
      this.errorCrear = 'La cuota inicial no puede ser mayor al precio total'; return;
    }

    this.guardando = true;

    const payload = {
      paciente_id:   this.paciente.id,
      tipo_bracket:  this.formPlan.tipo_bracket,
      precio_total:  this.formPlan.precio_total,
      cuota_inicial: this.formPlan.cuota_inicial ?? 0,
      observaciones: this.formPlan.observaciones,
      dientes:       []
    };

    this.svc.crearPlanOrtodoncia(payload).subscribe({
      next: () => {
        this.guardando  = false;
        this.exitoCrear = '✓ Plan de ortodoncia creado correctamente';
        setTimeout(() => {
          this.exitoCrear = '';
          this.cargarPlan();
        }, 1500);
      },
      error: (err) => {
        this.guardando  = false;
        this.errorCrear = err.error?.error ?? 'Error al crear el plan';
      }
    });
  }

  // ── Selección de dientes por rango ────────────────────────────────────────
  toggleDiente(diente: number): void {
    if (this.rangoInicio === null) {
      // primer clic → inicio del rango
      this.rangoInicio = diente;
      this.formSesion.dientes_sesion = [diente];
    } else {
      // segundo clic → fin del rango
      const todos = [
        ...this.SUPERIOR_DERECHO,
        ...this.SUPERIOR_IZQUIERDO,
        ...this.INFERIOR_IZQUIERDO,
        ...this.INFERIOR_DERECHO
      ];

      const idxInicio = todos.indexOf(this.rangoInicio);
      const idxFin    = todos.indexOf(diente);
      const desde     = Math.min(idxInicio, idxFin);
      const hasta     = Math.max(idxInicio, idxFin);

      this.formSesion.dientes_sesion = todos.slice(desde, hasta + 1);
      this.rangoInicio = null;
    }
  }

  isDienteSeleccionado(diente: number): boolean {
    return this.formSesion.dientes_sesion.includes(diente);
  }

  limpiarSeleccion(): void {
    this.formSesion.dientes_sesion = [];
    this.rangoInicio               = null;
  }

  seleccionarTodosSuperior(): void {
    this.formSesion.dientes_sesion = [
      ...this.SUPERIOR_DERECHO,
      ...this.SUPERIOR_IZQUIERDO
    ];
    this.rangoInicio = null;
  }

  seleccionarTodosInferior(): void {
    this.formSesion.dientes_sesion = [
      ...this.INFERIOR_IZQUIERDO,
      ...this.INFERIOR_DERECHO
    ];
    this.rangoInicio = null;
  }

  // ── Guardar sesión ────────────────────────────────────────────────────────
  guardarSesion(): void {
    this.errorSesion = '';

    if (this.formSesion.dientes_sesion.length === 0) {
      this.errorSesion = 'Selecciona al menos un diente'; return;
    }
    if (!this.formSesion.observaciones) {
      this.errorSesion = 'Las observaciones son obligatorias'; return;
    }
    if (this.formSesion.cuota_pagada && this.formSesion.cuota_pagada < 0) {
      this.errorSesion = 'La cuota no puede ser negativa'; return;
    }

    this.guardando = true;

    const payload = {
      plan_id:        this.planActivo.id,
      dientes_sesion: this.formSesion.dientes_sesion,
      observaciones:  this.formSesion.observaciones,
      cuota_pagada:   this.formSesion.cuota_pagada ?? 0,
      paciente_id:   this.paciente.id
    };

    this.svc.crearSesionOrtodoncia(payload).subscribe({
      next: () => {
        this.guardando   = false;
        this.exitoSesion = '✓ Sesión registrada correctamente';
        this.formSesion  = { dientes_sesion: [], observaciones: '', cuota_pagada: null };
        this.rangoInicio = null;
        setTimeout(() => {
          this.exitoSesion = '';
          this.cargarPlan();
        }, 1500);
      },
      error: (err) => {
        this.guardando   = false;
        this.errorSesion = err.error?.error ?? 'Error al registrar la sesión';
      }
    });
  }

  // ── Finalizar plan ────────────────────────────────────────────────────────
  finalizarPlan(): void {
    if (!confirm('¿Estás seguro de finalizar el plan de ortodoncia?')) return;
    this.svc.finalizarPlanOrtodoncia(this.planActivo.id).subscribe({
      next: () => {
        this.planActivo = null;
        this.vista      = 'crear';
        this.cargarPlan();
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getTipoBracket(tipo: string): string {
    return this.BRACKETS.find(b => b.value === tipo)?.label ?? tipo;
  }

  getSaldoActual(): number {
    if (!this.pagos) return 0;
    const totalPagado = Number(this.pagos.cuota_inicial) +
                        Number(this.pagos.pagado_sesiones);
    return Number(this.pagos.precio_total) - totalPagado;
  }

  getTotalPagado(): number {
    if (!this.pagos) return 0;
    return Number(this.pagos.cuota_inicial) + Number(this.pagos.pagado_sesiones);
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  getDientesTexto(dientes: any): string {
    if (!dientes) return '—';
    const arr = typeof dientes === 'string' ? JSON.parse(dientes) : dientes;
    if (!arr.length) return '—';
    const sorted = [...arr].sort((a, b) => a - b);
    return `Diente ${sorted[0]} al ${sorted[sorted.length - 1]}`;
  }
  get dientesSesionOrdenados(): string {
    return [...this.formSesion.dientes_sesion]
      .sort((a, b) => a - b)
      .join(', ');
  }

  generarPDFOrtodoncia(): void {
    try {
      const pdf = new jsPDF('p', 'mm', 'letter'); // vertical
      const W   = pdf.internal.pageSize.getWidth();
      let   y   = 15;

      // HEADER
      pdf.setFillColor(13, 112, 107);
      pdf.rect(0, 0, W, 22, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Clínica Dental Escobar', 14, 10);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Plan de Ortodoncia', 14, 16);
      pdf.text(`Impreso: ${new Date().toLocaleDateString('es-BO')}`, W - 14, 16, { align: 'right' });

      y = 30;

      // DATOS DEL PACIENTE Y PLAN
      pdf.setFillColor(240, 248, 248);
      pdf.rect(14, y, W - 28, 28, 'F');
      pdf.setDrawColor(13, 112, 107);
      pdf.rect(14, y, W - 28, 28, 'S');

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(22, 40, 48);
      pdf.text('DATOS DEL PACIENTE', 18, y + 7);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(74, 104, 112);
      pdf.text('Paciente:', 18, y + 14);
      pdf.setTextColor(22, 40, 48);
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.paciente?.nombre ?? '—', 45, y + 14);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(74, 104, 112);
      pdf.text('Tipo de bracket:', 18, y + 20);
      pdf.setTextColor(22, 40, 48);
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.getTipoBracket(this.planActivo?.tipo_bracket ?? ''), 55, y + 20);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(74, 104, 112);
      pdf.text('Inicio del plan:', 18, y + 26);
      pdf.setTextColor(22, 40, 48);
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.formatFecha(this.planActivo?.creado_en ?? ''), 55, y + 26);

      // Precio en la derecha
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(74, 104, 112);
      pdf.text('Precio total:', W - 80, y + 14);
      pdf.setTextColor(13, 112, 107);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(`Bs ${this.planActivo?.precio_total ?? 0}`, W - 80, y + 22);

      y += 36;

      // RESUMEN DE PAGOS
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(22, 40, 48);
      pdf.text('RESUMEN DE PAGOS', 14, y);
      y += 6;

      pdf.setFillColor(226, 232, 234);
      pdf.rect(14, y, W - 28, 6, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(74, 104, 112);
      pdf.text('Concepto', 18, y + 4);
      pdf.text('Monto', W - 40, y + 4);
      y += 7;

      const filasPago = [
        { label: 'Precio total del plan',  valor: `Bs ${this.pagos?.precio_total ?? 0}` },
        { label: 'Cuota inicial',          valor: `Bs ${this.pagos?.cuota_inicial ?? 0}` },
        { label: 'Pagado en sesiones',     valor: `Bs ${this.pagos?.pagado_sesiones ?? 0}` },
        { label: 'Total pagado',           valor: `Bs ${this.getTotalPagado()}` },
        { label: 'Saldo pendiente',        valor: `Bs ${this.getSaldoActual() <= 0 ? 0 : this.getSaldoActual()}` },
      ];

      filasPago.forEach((fila, idx) => {
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(14, y - 1, W - 28, 6, 'F');
        }
        pdf.setFont('helvetica', idx === 3 || idx === 4 ? 'bold' : 'normal');
        pdf.setTextColor(idx === 4 ? 239 : 22, idx === 4 ? 68 : 40, idx === 4 ? 68 : 48);
        pdf.setFontSize(8);
        pdf.text(fila.label, 18, y + 4);
        pdf.text(fila.valor, W - 40, y + 4);
        pdf.setDrawColor(240, 244, 245);
        pdf.line(14, y + 5.5, W - 14, y + 5.5);
        y += 6.5;
      });

      y += 6;

      // ── REFERENCIA ODONTOGRAMA ────────────────────────────────────────────
      y += 4;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(22, 40, 48);
      pdf.text('REFERENCIA ODONTOGRAMA', 14, y);
      y += 6;

      const size    = 3;
      const gap     = 0.5;
      const dienteW = size * 2.5 + gap * 2 + 3;

      const dibujarDienteRef = (diente: number, startX: number, startY: number) => {
        const w = size * 3 + gap * 2; // ancho total del diente
        const h = size * 3 + gap * 2; // alto total del diente
        const cx = startX + w / 2;    // centro x
        const cy = startY + h / 2;    // centro y

        // cuerpo del diente - elipse principal
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(150, 150, 150);
        pdf.ellipse(cx, cy, w / 2, h / 2.2, 'FD');

        // número del diente encima
        pdf.setFontSize(5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 40, 48);
        pdf.text(
          String(diente),
          cx,
          startY - 1,
          { align: 'center' }
        );
      };

      // Superior
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(74, 104, 112);
      pdf.text('MAXILAR SUPERIOR', 14, y);
      y += 4;

      const superiores = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
      let xSup = 14;
      superiores.forEach((diente, idx) => {
        if (idx === 8) xSup += 6; // separador centro
        dibujarDienteRef(diente, xSup, y);
        xSup += dienteW;
      });
      y += 18;

      // Inferior
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(74, 104, 112);
      pdf.text('MAXILAR INFERIOR', 14, y);
      y += 4;

      const inferiores = [31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48];
      let xInf = 14;
      inferiores.forEach((diente, idx) => {
        if (idx === 8) xInf += 6;
        dibujarDienteRef(diente, xInf, y);
        xInf += dienteW;
      });
      y += 20;

      // línea separadora
      pdf.setDrawColor(208, 216, 220);
      pdf.line(14, y, W - 14, y);
      y += 6;


      // HISTORIAL DE SESIONES
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(22, 40, 48);
      pdf.text('HISTORIAL DE SESIONES', 14, y);
      y += 6;

      if (this.sesiones.length === 0) {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(176, 190, 197);
        pdf.text('No hay sesiones registradas', 14, y + 4);
        y += 8;
      } else {
        // encabezados
        pdf.setFillColor(226, 232, 234);
        pdf.rect(14, y, W - 28, 6, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(74, 104, 112);
        pdf.text('Fecha',         18,       y + 4);
        pdf.text('Dientes',       55,       y + 4);
        pdf.text('Observaciones', 95,       y + 4);
        pdf.text('Cuota pagada',  W - 40,   y + 4);
        y += 7;

        this.sesiones.forEach((s, idx) => {
          if (y > 260) { pdf.addPage(); y = 15; }

          if (idx % 2 === 0) {
            pdf.setFillColor(248, 249, 250);
            pdf.rect(14, y - 1, W - 28, 6, 'F');
          }

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(22, 40, 48);

          pdf.text(this.formatFecha(s.creado_en), 18, y + 4);
          pdf.text(this.getDientesTexto(s.dientes_sesion), 55, y + 4);

          const obs = s.observaciones ?? '—';
          const obsMax = 55;
          const obsTxt = pdf.getTextWidth(obs) > obsMax
            ? obs.substring(0, Math.floor(obs.length * obsMax / pdf.getTextWidth(obs))) + '...'
            : obs;
          pdf.text(obsTxt, 95, y + 4);

          pdf.setTextColor(13, 112, 107);
          pdf.setFont('helvetica', 'bold');
          pdf.text(s.cuota_pagada > 0 ? `Bs ${s.cuota_pagada}` : '—', W - 40, y + 4);

          pdf.setDrawColor(240, 244, 245);
          pdf.line(14, y + 5.5, W - 14, y + 5.5);
          y += 6.5;
        });
      }

      // FOOTER
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setDrawColor(208, 216, 220);
        pdf.line(14, 272, W - 14, 272);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(176, 190, 197);
        pdf.text('Clínica Dental Escobar', 14, 277);
        pdf.text(`Página ${i} de ${pageCount}`, W - 14, 277, { align: 'right' });
      }

      const url = pdf.output('bloburl');
      window.open(url, '_blank');

    } catch (err) {
      console.error('Error PDF ortodoncia:', err);
    }
  }
}
