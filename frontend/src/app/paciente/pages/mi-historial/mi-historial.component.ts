import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-mi-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mi-historial.component.html',
  styleUrls: ['./mi-historial.component.css']
})
export class MiHistorialComponent implements OnInit {

  usuario:          any   = null;
  historialClinico: any   = null;
  tratamientos:     any[] = [];
  cargando          = false;
  pacienteId:       number = 0;

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

  constructor(
    private svc:  CitasService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario();
    this.svc.getPacienteByUsuarioId(this.usuario.id).subscribe({
      next: p => {
        if (p) {
          this.pacienteId = p.id;
          this.cargarHistorial(p.id);
          this.cargarTratamientos(p.id);
        }
      }
    });
  }

  cargarHistorial(pacienteId: number): void {
    this.cargando = true;
    this.svc.getHistorialClinicoPaciente(pacienteId).subscribe({
      next: h => {
        this.historialClinico = h;
        this.cargando         = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  cargarTratamientos(pacienteId: number): void {
    this.svc.getHistorialCompleto(pacienteId).subscribe({
      next: t => this.tratamientos = this.agruparHistorial(t)
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

  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}