import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../services/citas.service';

@Component({
  selector: 'app-pacientes',
  imports: [CommonModule, FormsModule],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.css'
})
export class PacientesComponent implements OnInit {

  // ── Lista ─────────────────────────────────────────────────────────────────
  pacientes:          any[] = [];
  pacientesFiltrados: any[] = [];
  cargando      = false;
  error         = '';
  busqueda      = '';

  // ── Modal nuevo paciente ──────────────────────────────────────────────────
  modalVisible  = false;
  paso          = 1;
  guardando     = false;
  errorModal    = '';
  exitoModal    = '';

  // ── Formulario paso 1 — cuenta de acceso ──────────────────────────────────
  formUsuario = {
    nombre:   '',
    apellido: '',
    email:    '',
    password: '',
    celular:  '',
  };
  mostrarPassword = false;

  // ── Formulario paso 2 — datos personales + historial ─────────────────────
  formPaciente = {
    fecha_nac:     '',
    genero:        '',
    telefono:      '',
    direccion:     '',
    sucursal_pref: null as number | null,
  };

  formHistorial = {
    grupo_sanguineo:         '',
    enfermedad_sistemica:    '',
    intervencion_quirurgica: '',
    hemorragia_anormal:      false,
    alergia_medicamentos:    '',
    medicacion_actual:       '',
    observaciones:           '',
  };

  constructor(private svc: CitasService) {}

  ngOnInit(): void { this.cargarPacientes(); }

  // ── Carga ─────────────────────────────────────────────────────────────────
  cargarPacientes(): void {
    this.cargando = true;
    this.svc.getPacientesConDetalle().subscribe({
      next: p => {
        this.pacientes          = p;
        this.pacientesFiltrados = p;
        this.cargando           = false;
      },
      error: () => {
        this.error    = 'No se pudo cargar la lista de pacientes';
        this.cargando = false;
      }
    });
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  filtrar(): void {
    const q = this.busqueda.toLowerCase().trim();
    this.pacientesFiltrados = !q
      ? this.pacientes
      : this.pacientes.filter(p =>
          `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
          p.email_acceso?.toLowerCase().includes(q) ||
          p.telefono?.includes(q)
        );
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  abrirModal(): void {
    this.modalVisible = true;
    this.paso         = 1;
    this.errorModal   = '';
    this.exitoModal   = '';
    this.guardando    = false;
    this.formUsuario  = {
      nombre: '', apellido: '', email: '', password: '', celular: ''
    };
    this.formPaciente = {
      fecha_nac: '', genero: '', telefono: '',
      direccion: '', sucursal_pref: null
    };
    this.formHistorial = {
      grupo_sanguineo: '', enfermedad_sistemica: '',
      intervencion_quirurgica: '', hemorragia_anormal: false,
      alergia_medicamentos: '', medicacion_actual: '', observaciones: ''
    };
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.modalVisible = false;
  }

  togglePassword(): void { this.mostrarPassword = !this.mostrarPassword; }
  //validar email
  validarEmail(email: string): boolean {
    const regex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email.trim());
  }
  // ── Navegación de pasos ───────────────────────────────────────────────────
  siguientePaso(): void {
    this.errorModal = '';
    if (!this.formUsuario.nombre)   { this.errorModal = 'El nombre es obligatorio';      return; }
    if (!this.formUsuario.apellido) { this.errorModal = 'El apellido es obligatorio';    return; }
    if (!this.formUsuario.email)    { this.errorModal = 'El email es obligatorio';       return; }
    if (!this.validarEmail(this.formUsuario.email)) {
      this.errorModal = 'Ingresa un correo electrónico válido'; return;
    }
    if (!this.formUsuario.password) { this.errorModal = 'La contraseña es obligatoria'; return; }
    if (this.formUsuario.password.length < 6) {
      this.errorModal = 'La contraseña debe tener al menos 6 caracteres'; return;
    }
    this.paso = 2;
  }

  anteriorPaso(): void {
    this.errorModal = '';
    this.paso = 1;
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  guardar(): void {
    this.errorModal = '';

    if (!this.formPaciente.sucursal_pref) {
      this.errorModal = 'Seleccioná una sucursal'; return;
    }

    this.guardando = true;

    const payload = {
      usuario: {
        nombre:   this.formUsuario.nombre,
        apellido: this.formUsuario.apellido,
        email:    this.formUsuario.email,
        password: this.formUsuario.password,
        celular:  this.formUsuario.celular,
        rol:      'paciente'
      },
      paciente: {
        telefono:      this.formPaciente.telefono,
        direccion:     this.formPaciente.direccion,
        fecha_nac:     this.formPaciente.fecha_nac,
        genero:        this.formPaciente.genero,
        sucursal_pref: this.formPaciente.sucursal_pref,
      },
      historial: this.formHistorial
    };

    this.svc.crearPaciente(payload).subscribe({
      next: () => {
        this.guardando  = false;
        this.exitoModal = '✓ Paciente registrado correctamente';
        this.cargarPacientes();
        setTimeout(() => this.cerrarModal(), 2000);
      },
      error: (err) => {
        this.guardando  = false;
        this.errorModal = err.error?.error ?? 'Error al registrar el paciente';
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  calcularEdad(fecha_nac: string): number {
    if (!fecha_nac) return 0;
    const hoy  = new Date();
    const nac  = new Date(fecha_nac);
    let edad   = hoy.getFullYear() - nac.getFullYear();
    const m    = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  get totalPacientes() { return this.pacientes.length; }
  get totalActivos()   { return this.pacientes.filter(p => p.activo).length; }

  // ── Modal editar ──────────────────────────────────────────────────────────
  modalEditarVisible    = false;
  pacienteSeleccionado: any = null;
  guardandoEdicion      = false;
  errorEdicion          = '';
  exitoEdicion          = '';
  pasoEdicion           = 1;
  mostrarNuevaPassword  = false;

  formEditar = {
    usuario: {
      nombre:   '',
      apellido: '',
      email:    '',
      celular:  '',
    },
    nuevaPassword:     '',
    confirmarPassword: '',
    paciente: {
      fecha_nac:     '',
      genero:        '',
      telefono:      '',
      direccion:     '',
      sucursal_pref: null as number | null,
    },
    historial: {
      grupo_sanguineo:         '',
      enfermedad_sistemica:    '',
      intervencion_quirurgica: '',
      hemorragia_anormal:      false,
      alergia_medicamentos:    '',
      medicacion_actual:       '',
      observaciones:           '',
    }
  };

  abrirEditar(p: any): void {
    this.pacienteSeleccionado = p;
    this.modalEditarVisible   = true;
    this.errorEdicion         = '';
    this.exitoEdicion         = '';
    this.guardandoEdicion     = false;
    this.pasoEdicion          = 1;
    this.formEditar.nuevaPassword     = '';
    this.formEditar.confirmarPassword = '';

    this.svc.getPacienteDetalle(p.id).subscribe({
      next: detalle => {
        this.formEditar.usuario = {
          nombre:   detalle.nombre  ?? '',
          apellido: detalle.apellido ?? '',
          email:    detalle.email_acceso ?? '',
          celular:  detalle.celular ?? '',
        };
        this.formEditar.paciente = {
          fecha_nac:     detalle.fecha_nac?.split('T')[0] ?? '',
          genero:        detalle.genero    ?? '',
          telefono:      detalle.telefono  ?? '',
          direccion:     detalle.direccion ?? '',
          sucursal_pref: detalle.sucursal_pref ?? null,
        };
        this.formEditar.historial = {
          grupo_sanguineo:         detalle.historial?.grupo_sanguineo         ?? '',
          enfermedad_sistemica:    detalle.historial?.enfermedad_sistemica    ?? '',
          intervencion_quirurgica: detalle.historial?.intervencion_quirurgica ?? '',
          hemorragia_anormal:      !!detalle.historial?.hemorragia_anormal,
          alergia_medicamentos:    detalle.historial?.alergia_medicamentos    ?? '',
          medicacion_actual:       detalle.historial?.medicacion_actual       ?? '',
          observaciones:           detalle.historial?.observaciones           ?? '',
        };
      }
    });
  }

  cerrarEditar(): void {
    if (this.guardandoEdicion) return;
    this.modalEditarVisible   = false;
    this.pacienteSeleccionado = null;
  }

  siguientePasoEdicion(): void {
    this.errorEdicion = '';
    if (!this.formEditar.usuario.email) {
      this.errorEdicion = 'El email es obligatorio'; return;
    }
    if (!this.validarEmail(this.formEditar.usuario.email)) {
      this.errorEdicion = 'Ingresa un correo electrónico válido'; return;
    }
    if (this.formEditar.nuevaPassword &&
        this.formEditar.nuevaPassword !== this.formEditar.confirmarPassword) {
      this.errorEdicion = 'Las contraseñas no coinciden'; return;
    }
    if (this.formEditar.nuevaPassword &&
        this.formEditar.nuevaPassword.length < 6) {
      this.errorEdicion = 'La contraseña debe tener al menos 6 caracteres'; return;
    }
    this.pasoEdicion = 2;
  }

  guardarEdicion(): void {
    this.errorEdicion = '';

    if (!this.formEditar.paciente.sucursal_pref) {
      this.errorEdicion = 'Seleccioná una sucursal'; return;
    }

    this.guardandoEdicion = true;

    const payload = {
      usuario: {
        nombre:   this.formEditar.usuario.nombre,
        apellido: this.formEditar.usuario.apellido,
        email:    this.formEditar.usuario.email,
        celular:  this.formEditar.usuario.celular,
      },
      nuevaPassword: this.formEditar.nuevaPassword || null,
      paciente:      this.formEditar.paciente,
      historial:     this.formEditar.historial,
    };

    this.svc.actualizarPaciente(this.pacienteSeleccionado.id, payload).subscribe({
      next: () => {
        this.guardandoEdicion = false;
        this.exitoEdicion     = '✓ Datos actualizados correctamente';
        this.cargarPacientes();
        setTimeout(() => this.cerrarEditar(), 2000);
      },
      error: (err) => {
        this.guardandoEdicion = false;
        this.errorEdicion     = err.error?.error ?? 'Error al actualizar';
      }
    });
  }
}