import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './../../services/auth.service';


export const authGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

export const adminGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const rol = auth.getRol();

  // ← si es paciente redirige a su dashboard
  if (rol === 'paciente') {
    router.navigate(['/paciente']);
    return false;
  }

  // ← solo admin, doctor y empleado pueden entrar
  if (!['admin', 'doctor', 'empleado'].includes(rol)) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

export const pacienteGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const rol = auth.getRol();
  
  if (rol !== 'paciente') {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};

export const empleadoGuard = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const rol = auth.getRol();

  if (rol === 'paciente') {
    router.navigate(['/paciente']);
    return false;
  }

  if (!['admin', 'doctor', 'empleado'].includes(rol)) {
    router.navigate(['/login']);
    return false;
  }

  // rutas restringidas para empleado
  const rutasRestringidas = [
    '/dashboard/reportes',
    '/dashboard/usuarios',
    '/dashboard/ingresos',
  ];

  if (rol === 'empleado' && rutasRestringidas.some(r => state.url.startsWith(r))) {
    router.navigate(['/dashboard/inicio']);
    return false;
  }

  return true;
};