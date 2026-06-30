import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CitasService } from '../../services/citas.service';
import { filter } from 'rxjs/operators';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-paciente-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class PacienteLayoutComponent implements OnInit, OnDestroy {
  menuMovilVisible = false;
  usuario:          any     = null;
  rutaActual:       string  = '';
  menuAbierto:      boolean = false;
  notifVisible:     boolean = false;
  notificaciones:   any[]   = [];
  noLeidas:         number  = 0;
  private polling:  Subscription | null = null;

  readonly MENU = [
    { label: 'Inicio',         ruta: '/paciente/inicio',         icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Mis citas',      ruta: '/paciente/mis-citas',      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Solicitar cita', ruta: '/paciente/solicitar-cita', icon: 'M12 4v16m8-8H4' },
    { label: 'Mis pagos',      ruta: '/paciente/mis-pagos',      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { label: 'Mi odontograma', ruta: '/paciente/mi-odontograma', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Mi historial',   ruta: '/paciente/mi-historial',   icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    {
      label: 'Mi perfil',
      ruta:  '/paciente/mi-perfil',
      icon:  'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
  ];

  
  readonly MENU_MOVIL = [
    { label: 'Inicio',    ruta: '/paciente/inicio',         icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Citas',     ruta: '/paciente/mis-citas',      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Solicitar', ruta: '/paciente/solicitar-cita', icon: 'M12 4v16m8-8H4' },
    { label: 'Pagos',     ruta: '/paciente/mis-pagos',      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  ];

  readonly MENU_EXTRA = [
    { label: 'Mi odontograma', ruta: '/paciente/mi-odontograma', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Mi historial',   ruta: '/paciente/mi-historial',   icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Mi perfil',      ruta: '/paciente/mi-perfil',      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  constructor(
    private auth:   AuthService,
    private svc:    CitasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.usuario    = this.auth.getUsuario();
    this.rutaActual = this.router.url;

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.rutaActual  = e.urlAfterRedirects;
      this.menuAbierto = false;
    });

    this.cargarNotificaciones();

    // polling cada 30 segundos
    this.polling = interval(5000).subscribe(() => {
      this.cargarNotificaciones();
    });
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }

  cargarNotificaciones(): void {
    this.svc.getNotificaciones().subscribe({
      next: n => {
        this.notificaciones = n;
        this.noLeidas       = n.filter((x: any) => !x.leida).length;
      }
    });
  }

  toggleNotif(): void {
    this.notifVisible = !this.notifVisible;
    if (this.notifVisible && this.noLeidas > 0) {
      this.svc.marcarTodasLeidas().subscribe({
        next: () => {
          this.noLeidas = 0;
          this.notificaciones = this.notificaciones.map(n => ({ ...n, leida: 1 }));
        }
      });
    }
  }

  cerrarNotif(): void {
    this.notifVisible = false;
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
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}