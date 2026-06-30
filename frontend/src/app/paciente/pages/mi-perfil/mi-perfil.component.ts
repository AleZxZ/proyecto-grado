import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.css']
})
export class MiPerfilComponent implements OnInit {

  usuario:          any    = null;
  guardando         = false;
  guardandoPassword = false;
  errorPerfil       = '';
  exitoPerfil       = '';
  errorPassword     = '';
  exitoPassword     = '';
  mostrarPassword   = false;
  mostrarConfirmar  = false;

  formPerfil = {
    nombre:   '',
    apellido: '',
    email:    '',
    celular:  '',
  };

  formPassword = {
    nuevaPassword:     '',
    confirmarPassword: '',
  };

  constructor(
    private svc:  CitasService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario();

    this.svc.getUsuarioById(this.usuario.id).subscribe({
      next: u => {
        this.usuario = u;
        this.formPerfil = {
          nombre:   u.nombre   ?? '',
          apellido: u.apellido ?? '',
          email:    u.email    ?? '',
          celular:  u.celular  ?? '',
        };
      }
    });
  }

  getRolLabel(): string {
    return 'Paciente';
  }

  guardarPerfil(): void {
    this.errorPerfil = '';

    if (!this.formPerfil.nombre)   { this.errorPerfil = 'El nombre es obligatorio';   return; }
    if (!this.formPerfil.apellido) { this.errorPerfil = 'El apellido es obligatorio'; return; }
    if (!this.formPerfil.email)    { this.errorPerfil = 'El email es obligatorio';    return; }

    this.guardando = true;

    this.svc.actualizarUsuario(this.usuario.id, {
      nombre:   this.formPerfil.nombre,
      apellido: this.formPerfil.apellido,
      email:    this.formPerfil.email,
      celular:  this.formPerfil.celular,
      rol:      this.usuario.rol,
      activo:   this.usuario.activo ?? 1,
    }).subscribe({
      next: () => {
        this.guardando   = false;
        this.exitoPerfil = '✓ Perfil actualizado correctamente';

        const usuarioActualizado = {
          ...this.usuario,
          nombre:   this.formPerfil.nombre,
          apellido: this.formPerfil.apellido,
          email:    this.formPerfil.email,
          celular:  this.formPerfil.celular,
        };
        localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
        this.usuario = { ...usuarioActualizado };

        setTimeout(() => this.exitoPerfil = '', 3000);
      },
      error: (err) => {
        this.guardando   = false;
        this.errorPerfil = err.error?.error ?? 'Error al actualizar el perfil';
      }
    });
  }

  cambiarPassword(): void {
    this.errorPassword = '';

    if (!this.formPassword.nuevaPassword) {
      this.errorPassword = 'La contraseña es obligatoria'; return;
    }
    if (this.formPassword.nuevaPassword.length < 6) {
      this.errorPassword = 'La contraseña debe tener al menos 6 caracteres'; return;
    }
    if (this.formPassword.nuevaPassword !== this.formPassword.confirmarPassword) {
      this.errorPassword = 'Las contraseñas no coinciden'; return;
    }

    this.guardandoPassword = true;

    this.svc.actualizarUsuario(this.usuario.id, {
      nombre:        this.formPerfil.nombre,
      apellido:      this.formPerfil.apellido,
      email:         this.formPerfil.email,
      celular:       this.formPerfil.celular,
      rol:           this.usuario.rol,
      activo:        this.usuario.activo ?? 1,
      nuevaPassword: this.formPassword.nuevaPassword,
    }).subscribe({
      next: () => {
        this.guardandoPassword              = false;
        this.exitoPassword                  = '✓ Contraseña actualizada correctamente';
        this.formPassword.nuevaPassword     = '';
        this.formPassword.confirmarPassword = '';
        setTimeout(() => this.exitoPassword = '', 3000);
      },
      error: (err) => {
        this.guardandoPassword = false;
        this.errorPassword     = err.error?.error ?? 'Error al cambiar la contraseña';
      }
    });
  }
}