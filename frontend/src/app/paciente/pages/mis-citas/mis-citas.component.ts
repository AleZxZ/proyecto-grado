import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-mis-citas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-citas.component.html',
  styleUrls: ['./mis-citas.component.css']
})
export class MisCitasComponent implements OnInit {

  usuario:   any    = null;
  citas:     any[]  = [];
  cargando   = false;
  filtro     = 'todas'; // todas | pendiente | realizada | cancelada

  // modal cancelar
  modalCancelarVisible = false;
  citaSeleccionada:  any = null;
  cancelando         = false;
  errorCancelar      = '';
  exitoCancelar      = '';

  constructor(
    private svc:  CitasService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario();
    this.cargarCitas();
  }

  cargarCitas(): void {
    this.cargando = true;
    this.svc.getMisCitas(this.usuario.id).subscribe({
      next: c => {
        this.citas    = c;
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  get citasFiltradas(): any[] {
    if (this.filtro === 'todas') return this.citas;
    return this.citas.filter(c => c.estado === this.filtro);
  }

  get countPendientes(): number {
    return this.citas.filter(c => c.estado === 'pendiente').length;
  }

  get countRealizadas(): number {
    return this.citas.filter(c => c.estado === 'realizada').length;
  }

  // ── Modal cancelar ────────────────────────────────────────────────────────
  abrirCancelar(cita: any): void {
    this.citaSeleccionada    = cita;
    this.modalCancelarVisible = true;
    this.errorCancelar       = '';
    this.exitoCancelar       = '';
    this.cancelando          = false;
  }

  cerrarCancelar(): void {
    this.modalCancelarVisible = false;
    this.citaSeleccionada    = null;
  }

  confirmarCancelar(): void {
    this.cancelando = true;
    this.svc.cancelarCita(this.citaSeleccionada.id).subscribe({
      next: () => {
        this.cancelando    = false;
        this.exitoCancelar = '✓ Cita cancelada correctamente';
        this.cargarCitas();
        setTimeout(() => this.cerrarCancelar(), 1500);
      },
      error: (err) => {
        this.cancelando    = false;
        this.errorCancelar = err.error?.error ?? 'Error al cancelar la cita';
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-BO', {
      weekday: 'long', day: '2-digit',
      month:   'long', year: 'numeric'
    });
  }

  formatHora(hora: string): string {
    if (!hora) return '—';
    return hora.slice(0, 5);
  }

  getEstadoColor(estado: string): string {
    const colores: Record<string, string> = {
      pendiente:  'rgba(13,112,107,0.15)',
      realizada:  'rgba(34,197,94,0.15)',
      cancelada:  'rgba(239,68,68,0.1)',
    };
    return colores[estado] ?? 'rgba(156,163,175,0.15)';
  }

  getEstadoTextColor(estado: string): string {
    const colores: Record<string, string> = {
      pendiente:  '#0a5955',
      realizada:  '#15803d',
      cancelada:  '#dc2626',
    };
    return colores[estado] ?? '#4a6870';
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      pendiente: '📅 Pendiente',
      realizada: '✓ Realizada',
      cancelada: '✕ Cancelada',
    };
    return labels[estado] ?? estado;
  }
}