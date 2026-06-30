import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../services/citas.service';
import { LucideAngularModule, Eye, EyeOff } from 'lucide-angular';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-pagos',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './pagos.component.html',
  styleUrl: './pagos.component.css'
})
export class PagosComponent implements OnInit {
  readonly Eye    = Eye;
  readonly EyeOff = EyeOff;
  mostrarMonto    = false;
  // ── Lista ─────────────────────────────────────────────────────────────────
  resumen:         any[] = [];
  resumenFiltrado: any[] = [];
  cargando         = false;
  error            = '';
  busqueda         = '';
  stats:           any  = null;

  // ── Modal abonar ──────────────────────────────────────────────────────────
  modalAbonarVisible  = false;
  pacienteSeleccionado: any = null;
  montoAbono          = null as number | null;
  notasAbono          = '';
  guardando           = false;
  errorAbono          = '';
  exitoAbono          = '';

  // ── Modal ver pagos ───────────────────────────────────────────────────────
  modalVerVisible   = false;
  pagosPaciente:    any[] = [];
  historialAbonos:  any[] = [];
  cargandoDetalle   = false;
  tabVer            = 'tratamientos'; // 'tratamientos' | 'abonos'


 
  constructor(private svc: CitasService, private auth: AuthService) {}

  ngOnInit(): void { 
    this.sucursalUsuario = this.auth.getSucursalId();
    this.cargarTodo(); 
  }
  sucursalUsuario: number | null = null;

  cargarTodo(): void {
    this.cargando = true;
    this.svc.getResumenPagosPorPaciente(this.sucursalUsuario).subscribe({
      next: r => {
        this.resumen         = r;
        this.resumenFiltrado = r;
        this.cargando        = false;
      },
      error: () => { this.error = 'Error al cargar'; this.cargando = false; }
    });

    this.svc.getStatsGlobalesPagos(this.sucursalUsuario).subscribe({
      next: s => this.stats = s
    });
  }

  filtrar(): void {
    const q = this.busqueda.toLowerCase().trim();
    this.resumenFiltrado = !q
      ? this.resumen
      : this.resumen.filter(p =>
          p.paciente_nombre.toLowerCase().includes(q)
        );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  get deudaTotal(): number {
    return Number(this.stats?.deuda_total ?? 0);
  }

  get totalCobrado(): number {
    return Number(this.stats?.total_cobrado_semana ?? 0);
  }

  get countPendientes(): number {
    return Number(this.stats?.count_pendientes ?? 0);
  }

  // ── Modal abonar ──────────────────────────────────────────────────────────
  abrirAbonar(paciente: any): void {
    this.pacienteSeleccionado = paciente;
    this.modalAbonarVisible   = true;
    this.montoAbono           = null;
    this.notasAbono           = '';
    this.sucursalAbono        = 1; // ← resetear
    this.errorAbono           = '';
    this.exitoAbono           = '';
    this.guardando            = false;
  }

  cerrarAbonar(): void {
    this.modalAbonarVisible   = false;
    this.pacienteSeleccionado = null;
  }

  sucursalAbono = 1;

  

  abonar(): void {
    this.errorAbono = '';

    if (!this.montoAbono || this.montoAbono <= 0) {
      this.errorAbono = 'El monto debe ser mayor a 0'; return;
    }
    if (this.montoAbono > this.pacienteSeleccionado.deuda_total) {
      this.errorAbono = `El abono no puede ser mayor a la deuda (Bs ${this.pacienteSeleccionado.deuda_total})`; return;
    }
   

    this.guardando = true;

    this.svc.abonarPaciente(
      this.pacienteSeleccionado.paciente_id,
      this.montoAbono,
      this.notasAbono,
      
    ).subscribe({
      next: () => {
        this.guardando  = false;
        this.exitoAbono = '✓ Abono registrado correctamente';
        this.cargarTodo();
        setTimeout(() => this.cerrarAbonar(), 1500);
      },
      error: (err) => {
        this.guardando  = false;
        this.errorAbono = err.error?.error ?? 'Error al registrar el abono';
      }
    });
  }

  pagarTodo(): void {
    this.montoAbono = this.pacienteSeleccionado.deuda_total;
    this.abonar();
  }

 
  // ── Modal ver pagos ───────────────────────────────────────────────────────
  abrirVer(paciente: any): void {
    this.pacienteSeleccionado = paciente;
    this.modalVerVisible      = true;
    this.tabVer               = 'tratamientos';
    this.cargandoDetalle      = true;
    this.pagosPaciente        = [];
    this.historialAbonos      = [];

    this.svc.getPagosPaciente(paciente.paciente_id).subscribe({
      next: p => this.pagosPaciente = p
    });

    this.svc.getHistorialAbonos(paciente.paciente_id).subscribe({
      next: a => {
        this.historialAbonos = a;
        this.cargandoDetalle = false;
      }
    });
  }

  cerrarVer(): void {
    this.modalVerVisible      = false;
    this.pacienteSeleccionado = null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  parseDetalle(detalle: any): any[] {
    if (!detalle) return [];
    return typeof detalle === 'string' ? JSON.parse(detalle) : detalle;
  }
}
