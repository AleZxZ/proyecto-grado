import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-mis-pagos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-pagos.component.html',
  styleUrls: ['./mis-pagos.component.css']
})
export class MisPagosComponent implements OnInit {

  usuario:   any   = null;
  pagos:     any   = null;
  cargando   = false;
  tabActual  = 'pendientes'; // pendientes | historial | ortodoncia

  constructor(
    private svc:  CitasService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario();
    this.svc.getPacienteByUsuarioId(this.usuario.id).subscribe({
      next: p => {
        if (p) this.cargarPagos(p.id);
      }
    });
  }

  cargarPagos(pacienteId: number): void {
    this.cargando = true;
    this.svc.getMisPagos(pacienteId).subscribe({
      next: p => {
        this.pagos    = p;
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  get deudaTotal(): number {
    return this.pagos?.pendientes
      ?.filter((p: any) => p.estado === 'pendiente')
      ?.reduce((acc: number, p: any) => acc + Number(p.saldo), 0) ?? 0;
  }

  get totalPagado(): number {
    return this.pagos?.pendientes
      ?.reduce((acc: number, p: any) => acc + Number(p.monto_pagado), 0) ?? 0;
  }

  parseDetalle(detalle: any): any[] {
    if (!detalle) return [];
    return typeof detalle === 'string' ? JSON.parse(detalle) : detalle;
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  get getTipoBracketLabel(): string {
    const labels: Record<string, string> = {
      metalico:   'Brackets metálicos',
      estetico:   'Brackets estéticos',
      autoligado: 'Brackets autoligado',
    };
    return labels[this.pagos?.ortodoncia?.[0]?.tipo_bracket] ?? '—';
  }

  get planOrtodoncia(): any {
    return this.pagos?.ortodoncia?.[0] ?? null;
  }

  get totalPagadoOrtodoncia(): number {
    if (!this.planOrtodoncia) return 0;
    return Number(this.planOrtodoncia.cuota_inicial ?? 0) +
          Number(this.planOrtodoncia.pagado_sesiones ?? 0);
  }
}