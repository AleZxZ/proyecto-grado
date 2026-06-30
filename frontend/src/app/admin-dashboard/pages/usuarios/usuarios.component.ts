import { Component, OnInit, ɵsetAllowDuplicateNgModuleIdsForTest } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {

  usuarioLogueadoId:  number | null = null;
  usuarioLogueadoRol: string        = '';

  // ── Lista ─────────────────────────────────────────────────────────────────
  usuarios:         any[] = [];
  usuariosFiltrados: any[] = [];
  cargando          = false;
  error             = '';
  busqueda          = '';

  // ── Modal crear ───────────────────────────────────────────────────────────
  modalCrearVisible = false;
  guardando         = false;
  errorModal        = '';
  exitoModal        = '';
  mostrarPassword   = false;

  formUsuario = {
    nombre:   '',
    apellido: '',
    email:    '',
    password: '',
    celular:  '',
    rol:      'empleado',
    activo:   1,
  };

  // ── Modal editar ──────────────────────────────────────────────────────────
  modalEditarVisible  = false;
  usuarioSeleccionado: any = null;
  guardandoEdicion    = false;
  errorEdicion        = '';
  exitoEdicion        = '';
  mostrarNuevaPassword = false;

  formEditar = {
    nombre:           '',
    apellido:         '',
    email:            '',
    celular:          '',
    rol:              '',
    activo:           1,
    nuevaPassword:    '',
    confirmarPassword: '',
  };

  readonly ROLES = [
    { value: 'empleado', label: 'Empleado' },
    { value: 'doctor', label: 'Doctor' },
  ];

  constructor(private svc: CitasService, private auth: AuthService) {}

  ngOnInit(): void { 
    this.usuarioLogueadoId  = this.auth.getId();
    this.usuarioLogueadoRol = this.auth.getRol();
    this.cargarUsuarios();
  }

  // ── Carga ─────────────────────────────────────────────────────────────────
  cargarUsuarios(): void {
    this.cargando = true;
    this.svc.getUsuarios().subscribe({
      next: u => {
        this.usuarios          = u;
        this.usuariosFiltrados = u;
        this.cargando          = false;
      },
      error: () => {
        this.error    = 'No se pudieron cargar los usuarios';
        this.cargando = false;
      }
    });
  }

  // ← método para saber si puede editar un usuario
  puedeEditar(u: any): boolean {
    // admin no puede editar ningún admin incluyéndose a sí mismo
    if (u.rol === 'admin') return false;
    // empleado y doctor sí se pueden editar
    if (u.rol === 'empleado' || u.rol === 'doctor') return true;
    return false;
  }

  // ── Filtro ────────────────────────────────────────────────────────────────
  filtrar(): void {
    const q = this.busqueda.toLowerCase().trim();
    this.usuariosFiltrados = !q
      ? this.usuarios
      : this.usuarios.filter(u =>
          u.nombre?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.rol?.toLowerCase().includes(q)
        );
  }

  // ── Modal crear ───────────────────────────────────────────────────────────
  abrirCrear(): void {
    this.modalCrearVisible = true;
    this.errorModal        = '';
    this.exitoModal        = '';
    this.guardando         = false;
    this.mostrarPassword   = false;
    this.formUsuario = {
      nombre:   '',
      apellido: '',
      email:    '',
      password: '',
      celular:  '',
      rol:      'empleado',
      activo:   1,
    };
  }

  cerrarCrear(): void {
    if (this.guardando) return;
    this.modalCrearVisible = false;
  }

  guardar(): void {
    this.errorModal = '';

    if (!this.formUsuario.nombre)   { this.errorModal = 'El nombre es obligatorio';      return; }
     if (!this.formUsuario.apellido) { this.errorModal = 'El apellido es obligatorio';   return; }
    if (!this.formUsuario.email)    { this.errorModal = 'El email es obligatorio';        return; }
    if (!this.formUsuario.password) { this.errorModal = 'La contraseña es obligatoria';  return; }
    if (this.formUsuario.password.length < 6) {
      this.errorModal = 'La contraseña debe tener al menos 6 caracteres'; return;
    }

    this.guardando = true;

    this.svc.crearUsuario(this.formUsuario).subscribe({
      next: () => {
        this.guardando  = false;
        this.exitoModal = '✓ Usuario creado correctamente';
        this.cargarUsuarios();
        setTimeout(() => this.cerrarCrear(), 1500);
      },
      error: (err) => {
        this.guardando  = false;
        this.errorModal = err.error?.error ?? 'Error al crear el usuario';
      }
    });
  }

  // ── Modal editar ──────────────────────────────────────────────────────────
  abrirEditar(u: any): void {
    this.usuarioSeleccionado    = u;
    this.modalEditarVisible     = true;
    this.errorEdicion           = '';
    this.exitoEdicion           = '';
    this.guardandoEdicion       = false;
    this.mostrarNuevaPassword   = false;

    this.formEditar = {
      nombre:            u.nombre,
      apellido:          u.apellido,
      email:             u.email,
      celular:           u.celular ?? '',
      rol:               u.rol,
      activo:            u.activo,
      nuevaPassword:     '',
      confirmarPassword: '',
    };
  }

  cerrarEditar(): void {
    if (this.guardandoEdicion) return;
    this.modalEditarVisible  = false;
    this.usuarioSeleccionado = null;
  }

  guardarEdicion(): void {
    this.errorEdicion = '';

    if (!this.formEditar.nombre) { this.errorEdicion = 'El nombre es obligatorio'; return; }
    if (!this.formEditar.apellido) { this.errorEdicion = 'El apellido es obligatorio'; return; }
    if (!this.formEditar.email)  { this.errorEdicion = 'El email es obligatorio';  return; }

    if (this.formEditar.nuevaPassword) {
      if (this.formEditar.nuevaPassword.length < 6) {
        this.errorEdicion = 'La contraseña debe tener al menos 6 caracteres'; return;
      }
      if (this.formEditar.nuevaPassword !== this.formEditar.confirmarPassword) {
        this.errorEdicion = 'Las contraseñas no coinciden'; return;
      }
    }

    this.guardandoEdicion = true;

    this.svc.actualizarUsuario(this.usuarioSeleccionado.id, this.formEditar).subscribe({
      next: () => {
        this.guardandoEdicion = false;
        this.exitoEdicion     = '✓ Usuario actualizado correctamente';
        this.cargarUsuarios();
        setTimeout(() => this.cerrarEditar(), 1500);
      },
      error: (err) => {
        this.guardandoEdicion = false;
        this.errorEdicion     = err.error?.error ?? 'Error al actualizar el usuario';
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getRolLabel(rol: string): string {
    return this.ROLES.find(r => r.value === rol)?.label ?? rol;
  }

  getRolColor(rol: string): string {
    const colores: Record<string, string> = {
      admin:    'rgba(139,92,246,0.15)',
      empleado: 'rgba(0,188,212,0.15)',
      doctor:   'rgba(139,195,74,0.15)',
      paciente: 'rgba(255,160,0,0.15)',
    };
    return colores[rol] ?? 'rgba(156,163,175,0.15)';
  }

  getRolTextColor(rol: string): string {
    const colores: Record<string, string> = {
      admin:    '#5b21b6',
      empleado: '#005f6b',
      doctor:   '#3d5c1a',
      paciente: '#7a4a00',
    };
    return colores[rol] ?? '#4a6870';
  }

  get totalActivos(): number {
    return this.usuarios.filter(u => u.activo).length;
  }
}
