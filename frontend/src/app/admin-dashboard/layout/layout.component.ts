import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { CitasService } from '../../services/citas.service';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';
import { interval, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, FormsModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {

  usuario:             any     = null;
  rutaActual:          string  = '';
  solicitudes:         any[]   = [];
  notifVisible:        boolean = false;
  private polling:     Subscription | null = null;

  // ── tratamientos para confirmar ───────────────────────────────────────────
  solicitudSeleccionada: any    = null;
  modalConfirmarVisible  = false;
  tratamientos:          any[]  = [];
  subtraFiltrados:       any[]  = [];
  confirmando            = false;
  errorConfirmar         = '';
  exitoConfirmar         = '';

  // ── Modal rechazar ────────────────────────────────────────────────────────
  modalRechazarVisible  = false;
  citaRechazarId:  number | null = null;
  motivoRechazo    = '';
  rechazando       = false;
  errorRechazar    = '';

  formConfirmar = {
    tratamiento_id:            null as number | null,
    subtratamiento_id:         null as number | null,
    tratamiento_personalizado: '',
  };
  esOtroTratamiento = false;

  readonly MENU = [
    { label: 'Inicio',        ruta: '/dashboard/inicio',      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Calendario',    ruta: '/dashboard/calendario',  icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Pacientes',     ruta: '/dashboard/pacientes',   icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Odontograma',   ruta: '/dashboard/odontograma', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Pagos',         ruta: '/dashboard/pagos',       icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { label: 'Ingresos',      ruta: '/dashboard/ingresos',    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Reportes',      ruta: '/dashboard/reportes',    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { label: 'Usuarios',      ruta: '/dashboard/usuarios',    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Mi perfil',     ruta: '/dashboard/perfil',      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    {
      label: 'Ajustes',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      ruta: '/dashboard/ajustes'
    },
  ];

  menuMovilVisible = false;

  readonly MENU_MOVIL = [
    { label: 'Inicio',     ruta: '/dashboard/inicio',      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Calendario', ruta: '/dashboard/calendario',  icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Pacientes',  ruta: '/dashboard/pacientes',   icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Pagos',      ruta: '/dashboard/pagos',       icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  ];

  readonly MENU_EXTRA = [
    { label: 'Odontograma', ruta: '/dashboard/odontograma', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Ingresos',    ruta: '/dashboard/ingresos',    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Reportes',    ruta: '/dashboard/reportes',    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { label: 'Usuarios',    ruta: '/dashboard/usuarios',    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Ajustes',     ruta: '/dashboard/ajustes',     icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Mi perfil',   ruta: '/dashboard/perfil',      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  constructor(
    private svc:    CitasService,
    private auth:   AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.usuario    = this.auth.getUsuario();
    this.rutaActual = this.router.url;

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.rutaActual  = e.urlAfterRedirects;
    });

    // cargar solicitudes al inicio
    this.cargarSolicitudes();

    // polling cada 30 segundos
    this.polling = interval(5000).subscribe(() => {
      this.cargarSolicitudes();
    });
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }

  cargarSolicitudes(): void {
    this.svc.getSolicitudesPendientes().subscribe({
      next: s => this.solicitudes = s
    });
  }

  get countSolicitudes(): number {
    return this.solicitudes.length;
  }

  toggleNotif(): void {
    this.notifVisible = !this.notifVisible;
  }

  cerrarNotif(): void {
    this.notifVisible = false;
  }

  // ── Modal confirmar ───────────────────────────────────────────────────────
  abrirConfirmar(s: any): void {
    //console.log('Solicitud:', s); // ← agregar
    this.solicitudSeleccionada = s;
    this.modalConfirmarVisible = true;
    this.errorConfirmar        = '';
    this.exitoConfirmar        = '';
    this.confirmando           = false;
    this.esOtroTratamiento     = false; // ← agregar
    this.formConfirmar         = { tratamiento_id: null, subtratamiento_id: null, tratamiento_personalizado: '' };
    this.subtraFiltrados       = [];
    
    //console.log('sucursal_id:', s.sucursal_id); // ← agregar
    this.svc.getTratamientos(s.sucursal_id).subscribe({
      next: t => 
        {
          //console.log('Tratamientos:', t); // ← agregar
          this.tratamientos = t

        }
    });
  }

  cerrarConfirmar(): void {
    this.modalConfirmarVisible = false;
    this.solicitudSeleccionada = null;
  }

  getTratamientosUnicos(): any[] {
    const vistos = new Set();
    return this.tratamientos.filter(t => {
      if (vistos.has(t.tratamiento_id)) return false;
      vistos.add(t.tratamiento_id);
      return true;
    });
  }

  onTratamientoChange(tratamientoId: number): void {
    this.formConfirmar.subtratamiento_id = null;
    this.formConfirmar.tratamiento_personalizado = '';

    if (tratamientoId === 0) {
      this.esOtroTratamiento = true;
      this.subtraFiltrados   = [];
      return;
    }

    this.esOtroTratamiento = false;
    this.subtraFiltrados = this.tratamientos.filter(
      (t: any) => t.tratamiento_id === tratamientoId
    );
  }

  confirmar(): void {
    if (this.formConfirmar.tratamiento_id === null) {
      this.errorConfirmar = 'Selecciona un tratamiento'; return;
    }

    if (!this.esOtroTratamiento && !this.formConfirmar.subtratamiento_id) {
      this.errorConfirmar = 'Selecciona un subtratamiento'; return;
    }

    this.confirmando = true;

    this.svc.confirmarSolicitud(
      this.solicitudSeleccionada.id,
      this.esOtroTratamiento ? null : this.formConfirmar.tratamiento_id,
      this.esOtroTratamiento ? null : this.formConfirmar.subtratamiento_id,
      this.esOtroTratamiento ? 'Otro' : null  // ← guarda literal "Otro"
    ).subscribe({
      next: () => {
        this.confirmando    = false;
        this.exitoConfirmar = '✓ Cita confirmada correctamente';
        this.cargarSolicitudes();
        setTimeout(() => {
          this.cerrarConfirmar();
          this.cerrarNotif();
        }, 1500);
      },
      error: (err) => {
        this.confirmando    = false;
        this.errorConfirmar = err.error?.error ?? 'Error al confirmar';
      }
    });
  }

 abrirRechazar(id: number): void {
    this.citaRechazarId      = id;
    this.modalRechazarVisible = true;
    this.motivoRechazo       = '';
    this.errorRechazar       = '';
    this.rechazando          = false;
  }

  cerrarRechazar(): void {
    this.modalRechazarVisible = false;
    this.citaRechazarId      = null;
  }

  confirmarRechazo(): void {
    this.rechazando = true;
    this.svc.rechazarSolicitud(this.citaRechazarId!, this.motivoRechazo).subscribe({
      next: () => {
        this.rechazando = false;
        this.cargarSolicitudes();
        this.cerrarRechazar();
        this.cerrarNotif();
      },
      error: (err) => {
        this.rechazando    = false;
        this.errorRechazar = err.error?.error ?? 'Error al rechazar';
      }
    });
  }

  esRutaActiva(ruta: string): boolean {
    return this.rutaActual.startsWith(ruta);
  }

  logout(): void {
    this.auth.logout();
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatHora(hora: string): string {
    if (!hora) return '—';
    return hora.slice(0, 5);
  }


  readonly RUTAS_RESTRINGIDAS_EMPLEADO = [
    '/dashboard/reportes',
    '/dashboard/usuarios',
    '/dashboard/ingresos',
  ];

  get MENU_FILTRADO(): any[] {
    if (this.auth.getRol() === 'empleado') {
      return this.MENU.filter(item =>
        !this.RUTAS_RESTRINGIDAS_EMPLEADO.includes(item.ruta)
      );
    }
    return this.MENU;
  }

  get MENU_MOVIL_FILTRADO(): any[] {
    return this.MENU_MOVIL; // ingresos no está en MENU_MOVIL así que no necesita filtro
  }

  get MENU_EXTRA_FILTRADO(): any[] {
    if (this.auth.getRol() === 'empleado') {
      return this.MENU_EXTRA.filter(item =>
        !this.RUTAS_RESTRINGIDAS_EMPLEADO.includes(item.ruta)
      );
    }
    return this.MENU_EXTRA;
  }
}