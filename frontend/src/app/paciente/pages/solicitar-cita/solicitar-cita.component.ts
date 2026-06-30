import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-solicitar-cita',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitar-cita.component.html',
  styleUrls: ['./solicitar-cita.component.css']
})
export class SolicitarCitaComponent implements OnInit {

  usuario:       any    = null;
  pacienteId:    number = 0;
  cargando       = false;
  guardando      = false;
  errorForm      = '';
  exitoForm      = '';
  fechasBloqueadas: string[] = [];

  // calendario público
  citasOcupadas: any[]  = [];

  // formulario
  form = {
    sucursal_id:  null as number | null,
    fecha:        '',
    hora:         '',
    notas:        '',
  };

  readonly HORAS = [
    '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00','11:30', 
    '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30',
    '17:30', '18:00', '18:30', '19:00', '19:30',
  ];

  // mes actual para el calendario
  mesActual  = new Date().getMonth();
  anioActual = new Date().getFullYear();

  readonly MESES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  readonly DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  constructor(
    private svc:  CitasService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario();
    this.cargarCalendario();
    this.obtenerPacienteId();
  }

  cargarFechasBloqueadas(sucursalId: number): void {
    this.svc.getFechasBloqueadasPorSucursal(sucursalId).subscribe({
      next: f => {
        this.fechasBloqueadas = f.map((x: any) =>
          typeof x.fecha === 'string' ? x.fecha.split('T')[0] : x.fecha
        );
        // si la fecha ya seleccionada quedó bloqueada, la limpiamos
        if (this.form.fecha && this.fechasBloqueadas.includes(this.form.fecha)) {
          this.form.fecha = '';
          this.form.hora  = '';
        }
      }
    });
  }

  obtenerPacienteId(): void {
    this.svc.getPacienteByUsuarioId(this.usuario.id).subscribe({
      next: p => this.pacienteId = p?.id ?? 0,
      error: () => {}
    });
  }

  cargarCalendario(): void {
    this.svc.getCalendarioPublico().subscribe({
      next: c => this.citasOcupadas = c
    });
  }

  // ── Calendario ────────────────────────────────────────────────────────────
  mesAnterior(): void {
    if (this.mesActual === 0) { this.mesActual = 11; this.anioActual--; }
    else this.mesActual--;
  }

  mesSiguiente(): void {
    if (this.mesActual === 11) { this.mesActual = 0; this.anioActual++; }
    else this.mesActual++;
  }

  get diasDelMes(): (number | null)[] {
    const primerDia = new Date(this.anioActual, this.mesActual, 1).getDay();
    const totalDias = new Date(this.anioActual, this.mesActual + 1, 0).getDate();
    const dias: (number | null)[] = Array(primerDia).fill(null);
    for (let i = 1; i <= totalDias; i++) dias.push(i);
    return dias;
  }

  getCitasDelDia(dia: number): any[] {
    const fechaStr = `${this.anioActual}-${String(this.mesActual + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    return this.citasOcupadas.filter(c => {
      const f = typeof c.fecha === 'string' ? c.fecha.split('T')[0] : c.fecha;
      return f === fechaStr;
    });
  }

  esDiaPasado(dia: number): boolean {
    const hoy   = new Date();
    const fecha = new Date(this.anioActual, this.mesActual, dia);
    fecha.setHours(0,0,0,0);
    hoy.setHours(0,0,0,0);
    return fecha < hoy;
  }

  esDomingo(dia: number): boolean {
    const fecha = new Date(this.anioActual, this.mesActual, dia);
    return fecha.getDay() === 0;
  }
  esDiaBloqueado(dia: number): boolean {
    const fechaStr = `${this.anioActual}-${String(this.mesActual + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    return this.fechasBloqueadas.includes(fechaStr);
  }

  esDiaDeshabilitado(dia: number): boolean {
    return this.esDiaPasado(dia) || this.esDomingo(dia) || this.esDiaBloqueado(dia);
  }

  esDiaSeleccionado(dia: number): boolean {
    const fechaStr = `${this.anioActual}-${String(this.mesActual + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    return this.form.fecha === fechaStr;
  }

  seleccionarDia(dia: number): void {
    if (this.esDiaDeshabilitado(dia)) return;
    this.form.fecha = `${this.anioActual}-${String(this.mesActual + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    this.form.hora  = '';
  }

  isHoraOcupada(hora: string): boolean {
    if (!this.form.fecha || !this.form.sucursal_id) return false;
    return this.citasOcupadas.some(c => {
      const f = typeof c.fecha === 'string' ? c.fecha.split('T')[0] : c.fecha;
      return f === this.form.fecha &&
             String(c.hora).slice(0,5) === hora &&
             c.sucursal_id === this.form.sucursal_id;
    });
  }

  isHoraPasada(hora: string): boolean {
    if (!this.form.fecha) return false;

    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

    // si la fecha seleccionada no es hoy, ninguna hora está pasada
    if (this.form.fecha !== fechaHoy) return false;

    // calcular hora límite (ahora + 1 hora)
    const limite = new Date();
    limite.setHours(limite.getHours() + 1);

    const [h, m] = hora.split(':').map(Number);
    const horaSlot = new Date();
    horaSlot.setHours(h, m, 0, 0);

    return horaSlot <= limite;
  }

  esHoy(fecha: string): boolean {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
    return fecha === fechaHoy;
  }

  isHoraDeshabilitada(hora: string): boolean {
    return this.isHoraOcupada(hora) || this.isHoraPasada(hora);
  }

  // ── Enviar solicitud ──────────────────────────────────────────────────────
  enviarSolicitud(): void {
    this.errorForm = '';

    if (!this.form.sucursal_id) { this.errorForm = 'Selecciona una sucursal';  return; }
    if (!this.form.fecha)       { this.errorForm = 'Selecciona una fecha';     return; }
    if (!this.form.hora)        { this.errorForm = 'Selecciona una hora';      return; }

    this.guardando = true;

    const payload = {
      paciente_id:  this.pacienteId,
      sucursal_id:  this.form.sucursal_id,
      fecha:        this.form.fecha,
      hora:         this.form.hora,
      motivo:       this.form.notas || 'Solicitud de cita',
      notas:        this.form.notas || null,
      tratamiento_id:    1, // ← temporal, la doctora asigna
      subtratamiento_id: 1, // ← temporal, la doctora asigna
       estado:            'solicitada',
    };

    this.svc.solicitarCita(payload).subscribe({
      next: () => {
        this.guardando  = false;
        this.exitoForm  = '✓ Solicitud enviada correctamente. La doctora confirmará tu cita.';
        this.form       = { sucursal_id: null, fecha: '', hora: '', notas: '' };
        this.cargarCalendario();
        setTimeout(() => this.exitoForm = '', 4000);
      },
      error: (err) => {
        this.guardando = false;
        this.errorForm = err.error?.error ?? 'Error al enviar la solicitud';
      }
    });
  }

  formatFechaSeleccionada(): string {
    if (!this.form.fecha) return '';
    return new Date(this.form.fecha + 'T00:00:00').toLocaleDateString('es-BO', {
      weekday: 'long', day: '2-digit',
      month:   'long', year: 'numeric'
    });
  }
}