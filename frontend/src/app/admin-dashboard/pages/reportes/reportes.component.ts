import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent implements OnInit {

  cargando         = false;
  generandoPDF     = false;
  datos:     any   = null;
  sucursalUsuario: number | null = null;
  sucursal         = 0;

  // rango de fechas (mes actual por defecto)
  fechaDesde = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];
  fechaHasta = new Date().toISOString().split('T')[0];

  readonly MESES = [
    'Ene','Feb','Mar','Abr','May','Jun',
    'Jul','Ago','Sep','Oct','Nov','Dic'
  ];

  readonly COLORES_ESTADOS: Record<string, string> = {
    sano:       '#e5e7eb',
    caries:     '#EF4444',
    restaurado: '#3B82F6',
    endodoncia: '#F97316',
    corona:     '#EAB308',
    sellante:   '#22C55E',
    fluor:      '#00BCD4',
    extraccion: '#1F2937',
    otro:       '#9CA3AF',
  };

  constructor(
    private svc:  CitasService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.sucursalUsuario = this.auth.getSucursalId();
    if (this.sucursalUsuario) {
      this.sucursal = this.sucursalUsuario;
    }
    this.cargarReporte();
  }

  cargarReporte(): void {
    this.cargando = true;
    this.svc.getReporteEstadisticas(
      this.sucursal || null,
      this.fechaDesde,
      this.fechaHasta
    ).subscribe({
      next: d => { this.datos = d; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  // ── Helpers gráfico barras ────────────────────────────────────────────────
  getMaxPorMes(): number {
    return Math.max(...(this.datos?.porMes?.map((m: any) => m.total) ?? [1]), 1);
  }

  getMaxTratamiento(): number {
    return Math.max(...(this.datos?.topTratamientos?.map((t: any) => t.total) ?? [1]), 1);
  }

  getTotalEstados(): number {
    return this.datos?.distribucionEstados?.reduce(
      (acc: number, e: any) => acc + Number(e.total), 0
    ) ?? 1;
  }

  getColorEstado(estado: string): string {
    return this.COLORES_ESTADOS[estado] ?? '#9CA3AF';
  }

  getSucursalNombre(id: number): string {
    return id === 1 ? 'Sucursal Centro' : 'Sucursal Este';
  }

  formatMesGrafico(mes: string): string {
    if (!mes) return '';
    const fecha = new Date(mes + '-01');
    return fecha.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  generarPDF(): void {
    if (!this.datos) return;
    this.generandoPDF = true;

    setTimeout(() => {
      try {
        const pdf = new jsPDF('p', 'mm', 'letter');
        const W   = pdf.internal.pageSize.getWidth();
        let   y   = 15;

        const hexToRgb = (hex: string) => [
          parseInt(hex.slice(1,3),16),
          parseInt(hex.slice(3,5),16),
          parseInt(hex.slice(5,7),16),
        ];

        // HEADER
        pdf.setFillColor(22, 40, 48);
        pdf.rect(0, 0, W, 22, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Clínica Dental Escobar', 14, 10);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          this.sucursal
            ? this.getSucursalNombre(this.sucursal)
            : 'Todas las sucursales',
          14, 16
        );
        pdf.text(`Reporte: ${this.fechaDesde} — ${this.fechaHasta}`, W - 14, 10, { align: 'right' });
        pdf.text(`Generado: ${new Date().toLocaleDateString('es-BO')}`, W - 14, 16, { align: 'right' });
        y = 30;

        // STATS
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 40, 48);
        pdf.text('RESUMEN GENERAL', 14, y);
        y += 6;

        const stats = [
          { label: 'Total pacientes',    valor: String(this.datos.totalPacientes)  },
          { label: 'Pacientes nuevos',   valor: String(this.datos.pacientesNuevos) },
          { label: 'Pacientes activos',  valor: String(this.datos.estadoPacientes?.activos ?? 0)   },
          { label: 'Pacientes inactivos',valor: String(this.datos.estadoPacientes?.inactivos ?? 0) },
        ];

        const statW = (W - 28) / 4;
        stats.forEach((s, idx) => {
          const x = 14 + idx * statW;
          pdf.setFillColor(238, 244, 245);
          pdf.setDrawColor(208, 216, 220);
          pdf.roundedRect(x, y, statW - 3, 18, 2, 2, 'FD');
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(74, 104, 112);
          pdf.text(s.label, x + (statW - 3) / 2, y + 6, { align: 'center' });
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(22, 40, 48);
          pdf.text(s.valor, x + (statW - 3) / 2, y + 14, { align: 'center' });
        });
        y += 24;

        // GRÁFICO PACIENTES POR MES
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 40, 48);
        pdf.text('PACIENTES NUEVOS POR MES', 14, y);
        y += 6;

        const maxMes    = this.getMaxPorMes();
        const barH      = 35;
        const barW      = (W - 28) / Math.max(this.datos.porMes.length, 1);

        this.datos.porMes.forEach((m: any, idx: number) => {
          const x        = 14 + idx * barW;
          const fillH    = Math.max((Number(m.total) / maxMes) * barH, 1);
          const barY     = y + barH - fillH;

          // barra
          pdf.setFillColor(0, 188, 212);
          pdf.roundedRect(x + 2, barY, barW - 4, fillH, 1, 1, 'F');

          // valor
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(22, 40, 48);
          pdf.text(String(m.total), x + barW / 2, barY - 1, { align: 'center' });

          // etiqueta mes
          pdf.setFontSize(5);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(74, 104, 112);
          pdf.text(m.mes.substring(0, 6), x + barW / 2, y + barH + 4, { align: 'center' });
        });
        y += barH + 10;

        // GRÁFICO TOP TRATAMIENTOS
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 40, 48);
        pdf.text('TOP 5 TRATAMIENTOS MÁS FRECUENTES', 14, y);
        y += 6;

        if (this.datos.topTratamientos.length === 0) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(176, 190, 197);
          pdf.text('No hay datos en este período', 14, y + 4);
          y += 10;
        } else {
          const maxTrat = this.getMaxTratamiento();
          const maxBarW = W - 80;

          this.datos.topTratamientos.forEach((t: any, idx: number) => {
            const fillW = Math.max((Number(t.total) / maxTrat) * maxBarW, 2);

            // etiqueta
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(22, 40, 48);
            const label = t.tratamiento.length > 25
              ? t.tratamiento.substring(0, 25) + '...'
              : t.tratamiento;
            pdf.text(label, 14, y + 4);

            // barra
            pdf.setFillColor(13, 112, 107);
            pdf.roundedRect(60, y, fillW, 5, 1, 1, 'F');

            // valor
            pdf.setFontSize(6);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(22, 40, 48);
            pdf.text(String(t.total), 60 + fillW + 2, y + 4);

            y += 8;
          });
        }

        y += 4;

        // DISTRIBUCIÓN DE ESTADOS
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 40, 48);
        pdf.text('DISTRIBUCIÓN DE ESTADOS CLÍNICOS', 14, y);
        y += 6;

        if (this.datos.distribucionEstados.length === 0) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(176, 190, 197);
          pdf.text('No hay datos en este período', 14, y + 4);
          y += 10;
        } else {
          const total    = this.getTotalEstados();
          const maxEstW  = W - 80;

          this.datos.distribucionEstados.forEach((e: any) => {
            if (y > 260) { pdf.addPage(); y = 15; }

            const pct   = ((Number(e.total) / total) * 100).toFixed(1);
            const fillW = Math.max((Number(e.total) / total) * maxEstW, 2);
            const color = this.getColorEstado(e.estado);

            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(22, 40, 48);
            pdf.text(
              e.estado.charAt(0).toUpperCase() + e.estado.slice(1),
              14, y + 4
            );

            try {
              const rgb = hexToRgb(color === '#e5e7eb' ? '#cccccc' : color);
              pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
            } catch { pdf.setFillColor(200, 200, 200); }

            pdf.roundedRect(60, y, fillW, 5, 1, 1, 'F');

            pdf.setFontSize(6);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(74, 104, 112);
            pdf.text(`${e.total} (${pct}%)`, 60 + fillW + 2, y + 4);

            y += 8;
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
        this.generandoPDF = false;

      } catch (err) {
        console.error('Error PDF:', err);
        this.generandoPDF = false;
      }
    }, 300);
  }
}