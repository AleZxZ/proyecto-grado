import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule,FormsModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit {

  usuario:      any   = null;
  citasHoy:     any[] = [];
  solicitudes:  any[] = [];
  statsGlobales: any  = null;
  cargando      = false;
  atendidosHoy: number = 0;
  marcandoRealizada: number | null = null;
  marcandoCancelada: number | null = null;

  pendientesAsignar:    any[]  = [];
  modalAsignarVisible   = false;
  citaAsignar:          any    = null;
  tratamientosAsignar:  any[]  = [];
  subtraAsignar:        any[]  = [];
  esOtroAsignar         = false;
  guardandoAsignar      = false;
  errorAsignar          = '';
  exitoAsignar          = '';

  modalListaAsignarVisible = false;

  formAsignar = {
    tratamiento_id:            null as number | null,
    subtratamiento_id:         null as number | null,
    tratamiento_personalizado: '',
  };

  constructor(
    private svc:  CitasService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario();
    this.cargarTodo();

    // polling cada 4 segundos
    interval(4000).subscribe(() => {
      this.svc.getCitasHoy().subscribe({
        next: c => this.citasHoy = c
      });
      this.svc.getSolicitudesPendientes().subscribe({
        next: s => this.solicitudes = s
      });
      this.svc.getPacientesAtendidosHoy().subscribe({
        next: r => this.atendidosHoy = r.total
      });
      this.svc.getPendientesAsignar().subscribe({
        next: p => this.pendientesAsignar = p
      });
    });
  }

  cargarTodo(): void {
    this.cargando = true;

    // citas de hoy
    this.svc.getCitasHoy().subscribe({
      next: c => { this.citasHoy = c; this.cargando = false; },
      error: () => { this.cargando = false; }
    });

    // solicitudes pendientes
    this.svc.getSolicitudesPendientes().subscribe({
      next: s => this.solicitudes = s
    });

    // stats de pagos
    this.svc.getStatsGlobalesPagos(this.auth.getSucursalId()).subscribe({
      next: s => this.statsGlobales = s
    });

    this.svc.getPacientesAtendidosHoy().subscribe({
      next: r => this.atendidosHoy = r.total
    });

    this.svc.getPendientesAsignar().subscribe({
      next: p => this.pendientesAsignar = p
    });
  }

  abrirAsignarLista(): void {
    this.modalListaAsignarVisible = true;
  }

  cerrarAsignarLista(): void {
    this.modalListaAsignarVisible = false;
  }

  abrirAsignar(cita: any): void {
    this.citaAsignar         = cita;
    this.modalAsignarVisible = true;
    this.errorAsignar        = '';
    this.exitoAsignar        = '';
    this.guardandoAsignar    = false;
    this.esOtroAsignar       = false;
    this.formAsignar         = { tratamiento_id: null, subtratamiento_id: null, tratamiento_personalizado: '' };
    this.subtraAsignar       = [];

    this.svc.getTratamientos(cita.sucursal_id).subscribe({
      next: t => this.tratamientosAsignar = t
    });
  }

  cerrarAsignar(): void {
    this.modalAsignarVisible = false;
    this.citaAsignar         = null;
  }

  getTratamientosUnicosAsignar(): any[] {
    const vistos = new Set();
    return this.tratamientosAsignar.filter(t => {
      if (vistos.has(t.tratamiento_id)) return false;
      vistos.add(t.tratamiento_id);
      return true;
    });
  }

  onTratamientoChangeAsignar(tratamientoId: number): void {
    this.formAsignar.subtratamiento_id = null;
    this.formAsignar.tratamiento_personalizado = '';

    if (tratamientoId === 0) {
      this.esOtroAsignar = true;
      this.subtraAsignar = [];
      return;
    }

    this.esOtroAsignar = false;
    this.subtraAsignar = this.tratamientosAsignar.filter(
      (t: any) => t.tratamiento_id === tratamientoId
    );
  }

  guardarAsignar(): void {
    this.errorAsignar = '';

    if (this.formAsignar.tratamiento_id === null) {
      this.errorAsignar = 'Selecciona un tratamiento'; return;
    }

    if (this.esOtroAsignar) {
      if (!this.formAsignar.tratamiento_personalizado.trim()) {
        this.errorAsignar = 'Especifica el tratamiento manualmente'; return;
      }
    } else if (!this.formAsignar.subtratamiento_id) {
      this.errorAsignar = 'Selecciona un subtratamiento'; return;
    }

    this.guardandoAsignar = true;

    this.svc.asignarTratamiento(
      this.citaAsignar.id,
      this.esOtroAsignar ? null : this.formAsignar.tratamiento_id,
      this.esOtroAsignar ? null : this.formAsignar.subtratamiento_id,
      this.esOtroAsignar ? this.formAsignar.tratamiento_personalizado.trim() : null
    ).subscribe({
      next: () => {
        this.guardandoAsignar = false;
        this.exitoAsignar     = '✓ Tratamiento asignado correctamente';
        this.cargarTodo();
        setTimeout(() => this.cerrarAsignar(), 1500);
      },
      error: (err) => {
        this.guardandoAsignar = false;
        this.errorAsignar     = err.error?.error ?? 'Error al asignar';
      }
    });
  }

  getSucursalNombre(): string {
    const id = this.usuario?.sucursal_id;
    if (!id) return 'Todas las sucursales';
    return id === 1 ? 'Sucursal Centro' : 'Sucursal Este';
  }

  formatHora(hora: string): string {
    if (!hora) return '—';
    return hora.slice(0, 5);
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-BO', {
      weekday: 'long', day: '2-digit',
      month: 'long', year: 'numeric'
    });
  }

  get fechaHoy(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', day: '2-digit',
      month: 'long', year: 'numeric'
    });
  }

  marcarRealizada(id: number): void {
    this.marcandoRealizada = id;
    this.svc.cambiarEstadoCita(id, 'realizada').subscribe({
      next: () => {
        this.marcandoRealizada = null;
        this.cargarTodo();
      },
      error: () => { this.marcandoRealizada = null; }
    });
  }
  marcarCancelada(id: number): void {
    if (!confirm('¿Cancelar esta cita?')) return;
    this.marcandoCancelada = id;
    this.svc.cambiarEstadoCita(id, 'cancelada').subscribe({
      next: () => {
        this.marcandoCancelada = null;
        this.cargarTodo();
      },
      error: () => { this.marcandoCancelada = null; }
    });
  }
}