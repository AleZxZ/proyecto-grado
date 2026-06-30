import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ajustes.component.html',
  styleUrls: ['./ajustes.component.css']
})
export class AjustesComponent implements OnInit {

  usuario:    any   = null;
  fechas:     any[] = [];
  cargando    = false;

  // form nueva fecha
  nuevaFecha  = '';
  nuevoMotivo = '';
  guardando   = false;
  error       = '';
  exito       = '';

  eliminando: number | null = null;

  fechaInicio = '';
  fechaFin    = '';

  constructor(
    private svc:  CitasService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario();
    this.cargarFechas();
  }

  cargarFechas(): void {
    this.cargando = true;
    this.svc.getFechasBloqueadas().subscribe({
      next: f => { this.fechas = f; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  agregarFecha(): void {
    this.error = '';
    this.exito = '';

    if (!this.fechaInicio) { this.error = 'Selecciona la fecha de inicio'; return; }
    if (!this.fechaFin)    { this.error = 'Selecciona la fecha de fin';    return; }
    if (this.fechaFin < this.fechaInicio) {
      this.error = 'La fecha final debe ser mayor o igual a la inicial'; return;
    }

    this.guardando = true;
    this.svc.crearRangoFechasBloqueadas(this.fechaInicio, this.fechaFin, this.nuevoMotivo).subscribe({
      next: (r) => {
        this.guardando  = false;
        this.exito      = '✓ ' + r.mensaje;
        this.fechaInicio = '';
        this.fechaFin    = '';
        this.nuevoMotivo = '';
        this.cargarFechas();
        setTimeout(() => this.exito = '', 2500);
      },
      error: (err) => {
        this.guardando = false;
        this.error     = err.error?.error ?? 'Error al bloquear las fechas';
      }
    });
  }

  eliminarFecha(id: number): void {
    if (!confirm('¿Desbloquear esta fecha?')) return;
    this.eliminando = id;
    this.svc.eliminarFechaBloqueada(id).subscribe({
      next: () => {
        this.eliminando = null;
        this.cargarFechas();
      },
      error: () => { this.eliminando = null; }
    });
  }

  getSucursalNombre(): string {
    const id = this.usuario?.sucursal_id;
    return id === 1 ? 'Sucursal Centro' : 'Sucursal Este';
  }

  formatFecha(fecha: string): string {
    const f = typeof fecha === 'string' ? fecha.split('T')[0] : fecha;
    return new Date(f + 'T00:00:00').toLocaleDateString('es-BO', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  get fechaMinima(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
  }

  esPasada(fecha: string): boolean {
    const f = typeof fecha === 'string' ? fecha.split('T')[0] : fecha;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return new Date(f + 'T00:00:00') < hoy;
  }
}
