import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CitasService } from '../../services/citas.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email    = '';
  password = '';
  cargando = false;
  error    = '';
  mostrarPassword = false;

  modalRecuperarVisible = false;
  emailRecuperar        = '';
  enviando              = false;
  errorRecuperar        = '';
  exitoRecuperar        = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private svc:    CitasService,
  ) {}

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  login(): void {
    if (!this.email || !this.password) {
      this.error = 'Por favor ingresa tu email y contraseña';
      return;
    }

    this.cargando = true;
    this.error    = '';

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.cargando = false;
        // redirigir según el rol
        if (res.usuario.rol === 'paciente') {
          this.router.navigate(['/paciente']); 
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.cargando = false;
        this.error    = err.error?.error ?? 'Error al iniciar sesión';
      }
    });
  }

  // ── Modal recuperar ───────────────────────────────────────────────────────
  abrirRecuperar(): void {

    if (!this.email) {
      this.error = 'Ingresa tu correo primero para recuperar la contraseña';
      return;
    }
    this.modalRecuperarVisible = true;
    this.emailRecuperar        = this.email; 
    this.errorRecuperar        = '';
    this.exitoRecuperar        = false;
    this.enviando              = false;
  }
  cerrarRecuperar(): void {
    if (this.enviando) return;
    this.modalRecuperarVisible = false;
  }

  enviarRecuperar(): void {
    this.errorRecuperar = '';

    if (!this.email) {
      this.errorRecuperar = 'Ingresa tu correo en el login primero'; return;
    }

    this.enviando = true;

    this.svc.recuperarPassword(this.email).subscribe({
      next: () => {
        this.enviando       = false;
        this.exitoRecuperar = true;
      },
      error: (err) => {
        this.enviando       = false;
        this.errorRecuperar = err.error?.error ?? 'Error al enviar el correo';
      }
    });
  }

  enmascararEmail(email: string): string {
    if (!email) return '';
    const [usuario, dominio] = email.split('@');
    const visible = usuario.charAt(0);
    const oculto  = '*'.repeat(usuario.length - 1);
    return `${visible}${oculto}@${dominio}`;
  }
}
