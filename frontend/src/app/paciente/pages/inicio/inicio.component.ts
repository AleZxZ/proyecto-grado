import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-paciente-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class PacienteInicioComponent implements OnInit {

  usuario:       any    = null;
  citas:         any[]  = [];
  pagos:         any    = null;
  cargando       = false;
  

  constructor(
    private svc:  CitasService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario();
    this.svc.getPacienteByUsuarioId(this.usuario.id).subscribe({
      next: p => {
        if (p) {
          this.cargarDatos(p.id);
        }
      }
    });
  }

  cargarDatos(pacienteId: number): void {
  this.cargando = true;

  this.svc.getMisCitas(this.usuario.id).subscribe({
    next: c => {
      this.citas    = c.slice(0, 3);
      this.cargando = false;
    },
    error: () => { this.cargando = false; }
  });

  this.svc.getMisPagos(pacienteId).subscribe({
    next: p => {
     // console.log('PAGOS:', p); // ← agregar temporal
      this.pagos = p;
    },
    error: (err) => {
      console.log('ERROR pagos:', err);
    }
  });
}

  get citasPendientes(): any[] {
    return this.citas.filter(c => c.estado === 'pendiente');
  }

  get pagosPendientes(): number {
    return this.pagos?.pendientes?.filter(
      (p: any) => p.estado === 'pendiente'
    ).length ?? 0;
  }

  get deudaTotal(): number {
    return this.pagos?.pendientes
      ?.filter((p: any) => p.estado === 'pendiente')
      ?.reduce((acc: number, p: any) => acc + Number(p.saldo), 0) ?? 0;
  }

  getSucursalNombre(id: number): string {
    return id === 1 ? 'Sucursal Centro' : 'Sucursal Este';
  }

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

  
}