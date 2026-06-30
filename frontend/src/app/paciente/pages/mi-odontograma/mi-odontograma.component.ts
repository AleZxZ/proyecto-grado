import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-mi-odontograma',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mi-odontograma.component.html',
  styleUrls: ['./mi-odontograma.component.css']
})
export class MiOdontogramaComponent implements OnInit {

  usuario:     any   = null;
  odontograma: any[] = [];
  cargando     = false;

  readonly SUPERIOR_DERECHO   = [18,17,16,15,14,13,12,11];
  readonly SUPERIOR_IZQUIERDO = [21,22,23,24,25,26,27,28];
  readonly INFERIOR_IZQUIERDO = [31,32,33,34,35,36,37,38];
  readonly INFERIOR_DERECHO   = [41,42,43,44,45,46,47,48];
  readonly CARAS = ['vestibular','oclusal','mesial','distal','palatino'];

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

  readonly ESTADOS = [
    { value: 'sano',       label: 'Sano',        color: '#ffffff' },
    { value: 'caries',     label: 'Caries',       color: '#EF4444' },
    { value: 'restaurado', label: 'Restaurado',   color: '#3B82F6' },
    { value: 'endodoncia', label: 'Endodoncia',   color: '#F97316' },
    { value: 'corona',     label: 'Corona',       color: '#EAB308' },
    { value: 'sellante',   label: 'Sellante',     color: '#22C55E' },
    { value: 'fluor',      label: 'Flúor',        color: '#00BCD4' },
    { value: 'extraccion', label: 'Extracción',   color: '#1F2937' },
    { value: 'otro',       label: 'Otro',         color: '#9CA3AF' },
  ];

  constructor(
    private svc:  CitasService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario();
    this.svc.getPacienteByUsuarioId(this.usuario.id).subscribe({
      next: p => { if (p) this.cargarOdontograma(p.id); }
    });
  }

  cargarOdontograma(pacienteId: number): void {
    this.cargando = true;
    this.svc.getMiOdontograma(pacienteId).subscribe({
      next: d => { this.odontograma = d; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  get dientesSuperiores(): number[] {
    return [...this.SUPERIOR_DERECHO, ...this.SUPERIOR_IZQUIERDO];
  }

  get dientesInferiores(): number[] {
    return [...this.INFERIOR_IZQUIERDO, ...this.INFERIOR_DERECHO];
  }

  getCaraData(diente: number, cara: string): any {
    return this.odontograma.find(o => o.diente === diente && o.cara === cara);
  }

  getCaraColor(diente: number, cara: string): string {
    const data = this.getCaraData(diente, cara);
    if (!data) return this.COLORES['sano'];
    return this.COLORES[data.estado] ?? this.COLORES['otro'];
  }

  getCaraEstado(diente: number, cara: string): string {
    return this.getCaraData(diente, cara)?.estado ?? 'sano';
  }

  isDienteExtraido(diente: number): boolean {
    return this.CARAS.every(c => this.getCaraEstado(diente, c) === 'extraccion');
  }

  getTratamientoDiente(diente: number): string {
    const data = this.odontograma.find(o =>
      o.diente === diente && o.tratamiento
    );
    return data?.tratamiento ?? '';
  }
}