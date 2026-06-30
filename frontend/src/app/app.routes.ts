import { Routes } from '@angular/router';
import { LayoutComponent } from './admin-dashboard/layout/layout.component';
import { InicioComponent } from './admin-dashboard/pages/inicio/inicio.component';
import { CalendarioComponent } from './calendario/calendario.component';
import { LoginComponent } from './auth/login/login.component';
import { adminGuard, authGuard, empleadoGuard, pacienteGuard } from './core/guards/auth.guard';
import { PacientesComponent } from './admin-dashboard/pages/pacientes/pacientes.component';
import { OdontogramaComponent } from './admin-dashboard/pages/odontograma/odontograma.component';
import { PagosComponent } from './admin-dashboard/pages/pagos/pagos.component';
import { IngresosComponent } from './admin-dashboard/pages/ingresos/ingresos.component';
import { UsuariosComponent } from './admin-dashboard/pages/usuarios/usuarios.component';
import { PerfilComponent } from './admin-dashboard/pages/perfil/perfil.component';
import { ReportesComponent } from './admin-dashboard/pages/reportes/reportes.component';
import { PacienteLayoutComponent } from './paciente/layout/layout.component';
import { MiHistorialComponent } from './paciente/pages/mi-historial/mi-historial.component';
import { MiOdontogramaComponent } from './paciente/pages/mi-odontograma/mi-odontograma.component';
import { MisCitasComponent } from './paciente/pages/mis-citas/mis-citas.component';
import { MisPagosComponent } from './paciente/pages/mis-pagos/mis-pagos.component';
import { SolicitarCitaComponent } from './paciente/pages/solicitar-cita/solicitar-cita.component';
import { PacienteInicioComponent } from './paciente/pages/inicio/inicio.component'; 
import { AjustesComponent } from './admin-dashboard/pages/ajustes/ajustes.component';
import { MiPerfilComponent } from './paciente/pages/mi-perfil/mi-perfil.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
    // dashboard admin/doctor/empleado
    {
    path: 'dashboard',
    component: LayoutComponent,
    canActivate: [empleadoGuard], 
  //  canActivateChild: [adminGuard],
    children: [
      { path: '',         redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio',   component: InicioComponent },
      { path: 'calendario', component: CalendarioComponent },
      { path: 'pacientes',  component: PacientesComponent },  
      { path: 'odontograma', component: OdontogramaComponent }, 
      { path: 'pagos', component: PagosComponent  }, 
      { path: 'ingresos',   component: IngresosComponent },  
      { path: 'usuarios',   component: UsuariosComponent },  
      { path: 'ajustes',   component: AjustesComponent },  
      { path: 'perfil', component: PerfilComponent },
      { path: 'reportes', component: ReportesComponent },
    ]
  },
  // dashboard paciente
  {
    path: 'paciente',
    component: PacienteLayoutComponent,
    canActivate: [pacienteGuard],
   // canActivateChild: [pacienteGuard], 
    children: [
      { path: 'inicio',         component: PacienteInicioComponent },
      { path: 'mis-citas',      component: MisCitasComponent },
      { path: 'solicitar-cita', component: SolicitarCitaComponent },
      { path: 'mis-pagos',      component: MisPagosComponent },
      { path: 'mi-odontograma', component: MiOdontogramaComponent },
      { path: 'mi-historial',   component: MiHistorialComponent },
      { path: 'mi-perfil', component: MiPerfilComponent },
      { path: '',               redirectTo: 'inicio', pathMatch: 'full' },
    ]
  },
  { path: '',   redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
