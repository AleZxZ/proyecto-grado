import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  
  

  private api = 'https://proyecto-grado-production-deae.up.railway.app/api/auth';
  //private api = 'http://localhost:3000/api/auth';

  //private api = 'http://192.168.1.6:3000/api/auth';

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<any>(`${this.api}/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('token',   res.token);
        localStorage.setItem('usuario', JSON.stringify(res.usuario));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUsuario(): any {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRol(): string {
    return this.getUsuario()?.rol ?? '';
  }

  getSucursalId(): number | null {
    return this.getUsuario()?.sucursal_id ?? null;
  }

  // true si puede ver todas las sucursales
  esAdminGlobal(): boolean {
    return this.getUsuario()?.sucursal_id === null;
  }

  getId(): number | null {
    return this.getUsuario()?.id ?? null;
  }

  esAdmin(): boolean {
    return this.getUsuario()?.rol === 'admin';
  }
}