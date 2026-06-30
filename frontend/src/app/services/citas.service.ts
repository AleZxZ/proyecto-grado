// src/app/services/citas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Paciente, Prediccion, PrediccionResponse, CalendarioResponse } from '../models/cita.model';

@Injectable({ providedIn: 'root' })
export class CitasService {

  private api = 'https://proyecto-grado-production-deae.up.railway.app/api';
  //private api = 'http://localhost:3000/api';

  //private api = 'http://192.168.1.6:3000/api';

  constructor(private http: HttpClient) {}

  getPacientes(): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(`${this.api}/pacientes`);
  }

  /*getPredicciones(pacienteId: number, meses = 2): Observable<PrediccionResponse> {
    const params = new HttpParams().set('meses', meses);
    return this.http.get<PrediccionResponse>(
      `${this.api}/pacientes/${pacienteId}/predicciones`, { params }
    );
  }*/

  getCalendarioTodos(meses = 2): Observable<CalendarioResponse> {
    const params = new HttpParams().set('meses', meses);
    return this.http.get<CalendarioResponse>(
      `${this.api}/pacientes/calendario/todos`, { params }
    );
  }
  
  getTratamientos(sucursalId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/citas/tratamientos/${sucursalId}`);
  }

  getDoctores(sucursalId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/citas/doctores/${sucursalId}`);
  }

  confirmarCita(datos: any): Observable<any> {
    return this.http.post<any>(`${this.api}/citas/confirmar`, datos);
  }

  eliminarCita(id: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/citas/${id}`);
  }

  getPacientesConDetalle(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/pacientes/detalle`);
  }

  getHistorialClinicoPaciente(pacienteId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/pacientes/${pacienteId}/historial-clinico`);
  }

  getPacienteDetalle(id: number): Observable<any> {
   return this.http.get<any>(`${this.api}/pacientes/${id}/detalle`);
  }

  crearPaciente(datos: any): Observable<any> {
    return this.http.post<any>(`${this.api}/pacientes`, datos);
  }
  actualizarPaciente(id: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.api}/pacientes/${id}`, datos);
  }
  getOdontograma(pacienteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/odontograma/${pacienteId}`);
  }

  guardarCara(pacienteId: number, datos: any): Observable<any> {
    return this.http.post<any>(`${this.api}/odontograma/${pacienteId}`, datos);
  }

  

  getHistorialCara(pacienteId: number, diente: number, cara: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/odontograma/${pacienteId}/${diente}/${cara}/historial`);
  }
  getHistorialCompleto(pacienteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/odontograma/${pacienteId}/historial/completo`);
  }
  editarRegistroOdontograma(id: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.api}/odontograma/registro/${id}`, datos);
  }
  eliminarRegistroOdontograma(pacienteId: number, id: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/odontograma/${pacienteId}/registro/${id}`);
  }



  getPlanOrtodoncia(pacienteId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/ortodoncia/${pacienteId}/plan`);
  }

  crearPlanOrtodoncia(datos: any): Observable<any> {
    return this.http.post<any>(`${this.api}/ortodoncia/plan`, datos);
  }

  crearSesionOrtodoncia(datos: any): Observable<any> {
    return this.http.post<any>(`${this.api}/ortodoncia/sesion`, datos);
  }

  finalizarPlanOrtodoncia(planId: number): Observable<any> {
    return this.http.put<any>(`${this.api}/ortodoncia/plan/${planId}/finalizar`, {});
  }


  
  

  getStatsGlobalesPagos(sucursalId: number | null = null): Observable<any> {
    const params = sucursalId ? `?sucursal_id=${sucursalId}` : '';
    return this.http.get<any>(`${this.api}/pagos/stats${params}`);
  }

  getResumenPagosPorPaciente(sucursalId: number | null = null): Observable<any[]> {
    const params = sucursalId ? `?sucursal_id=${sucursalId}` : '';
    return this.http.get<any[]>(`${this.api}/pagos/resumen${params}`);
  }

  getPagosPaciente(pacienteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/pagos/paciente/${pacienteId}`);
  }

  getHistorialAbonos(pacienteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/pagos/paciente/${pacienteId}/abonos`);
  }

  crearPago(datos: any): Observable<any> {
    return this.http.post<any>(`${this.api}/pagos`, datos);
  }
  abonarPaciente(pacienteId: number, monto: number, notas: string): Observable<any> {
    return this.http.post<any>(
      `${this.api}/pagos/paciente/${pacienteId}/abonar`,
      { monto, notas }
    );
  }
  eliminarPago(id: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/pagos/${id}`);
  }




  getIngresosMes(mes: number, anio: number, sucursal: number): Observable<any> {
    return this.http.get<any>(
      `${this.api}/ingresos?mes=${mes}&anio=${anio}&sucursal=${sucursal}`
    );
  }
  crearGasto(datos: any): Observable<any> {
    return this.http.post<any>(`${this.api}/ingresos/gastos`, datos);
  }
  eliminarGasto(id: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/ingresos/gastos/${id}`);
  }



  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/usuarios`);
  }

  crearUsuario(datos: any): Observable<any> {
    return this.http.post<any>(`${this.api}/usuarios`, datos);
  }

  actualizarUsuario(id: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.api}/usuarios/${id}`, datos);
  }
  getUsuarioById(id: number): Observable<any> {
    return this.http.get<any>(`${this.api}/usuarios/${id}`);
  }


  getReporteEstadisticas(
    sucursalId: number | null,
    fechaDesde: string,
    fechaHasta: string
  ): Observable<any> {
    let params = `fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
    if (sucursalId) params += `&sucursal_id=${sucursalId}`;
    return this.http.get<any>(`${this.api}/reportes?${params}`);
  }

  getReporteIngresos(fechaDesde: string, fechaHasta: string): Observable<any> {
    return this.http.get<any>(
      `${this.api}/ingresos/reporte?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`
    );
  }

  //para pacientes

  getPacienteByUsuarioId(usuarioId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/pacientes/by-usuario/${usuarioId}`);
  }

  getMisCitas(pacienteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/pacientes/${pacienteId}/mis-citas`);
  }

  getMisPagos(pacienteId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/pacientes/${pacienteId}/mis-pagos`);
  }

  getMiOdontograma(pacienteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/pacientes/${pacienteId}/mi-odontograma`);
  }

  solicitarCita(datos: any): Observable<any> {
    return this.http.post<any>(`${this.api}/citas`, datos);
  }

  getCitasCalendarioPaciente(): Observable<any> {
    return this.http.get<any>(`${this.api}/pacientes/calendario/todos`);
  }

  cancelarCita(id: number): Observable<any> {
    return this.http.put<any>(`${this.api}/citas/${id}/estado`, { estado: 'cancelada' });
  }

  getCalendarioPublico(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/citas/calendario-publico`);
  }

  getSolicitudesPendientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/citas/solicitudes`);
  }

  getCitasHoy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/citas/hoy`);
  }
  cambiarEstadoCita(id: number, estado: string): Observable<any> {
    return this.http.put<any>(`${this.api}/citas/${id}/estado`, { estado });
  }

  

  rechazarSolicitud(id: number, motivo: string = ''): Observable<any> {
    return this.http.put<any>(`${this.api}/citas/${id}/rechazar`, { motivo });
  }


  getNotificaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/notificaciones`);
  }

  getNotificacionesNoLeidas(): Observable<any> {
    return this.http.get<any>(`${this.api}/notificaciones/no-leidas`);
  }

  marcarNotificacionLeida(id: number): Observable<any> {
    return this.http.put<any>(`${this.api}/notificaciones/${id}/leer`, {});
  }

  marcarTodasLeidas(): Observable<any> {
    return this.http.put<any>(`${this.api}/notificaciones/leer-todas`, {});
  }

  getPacientesAtendidosHoy(): Observable<any> {
    return this.http.get<any>(`${this.api}/citas/atendidos-hoy`);
  }


  confirmarSolicitud(id: number, tratamientoId: number | null, subtratamientoId: number | null, personalizado: string | null): Observable<any> {
    return this.http.put<any>(`${this.api}/citas/${id}/confirmar`, {
      tratamiento_id:            tratamientoId,
      subtratamiento_id:         subtratamientoId,
      tratamiento_personalizado: personalizado
    });
  }



  getPendientesAsignar(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/citas/pendientes-asignar`);
  }

  asignarTratamiento(id: number, tratamientoId: number | null, subtratamientoId: number | null, personalizado: string | null): Observable<any> {
    return this.http.put<any>(`${this.api}/citas/${id}/asignar-tratamiento`, {
      tratamiento_id:            tratamientoId,
      subtratamiento_id:         subtratamientoId,
      tratamiento_personalizado: personalizado
    });
  }

  getFechasBloqueadas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/ajustes/fechas-bloqueadas`);
  }

  crearFechaBloqueada(fecha: string, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.api}/ajustes/fechas-bloqueadas`, { fecha, motivo });
  }

  eliminarFechaBloqueada(id: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/ajustes/fechas-bloqueadas/${id}`);
  }

  getTodasFechasBloqueadas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/ajustes/fechas-bloqueadas-todas`);
  }
  crearRangoFechasBloqueadas(fechaInicio: string, fechaFin: string, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.api}/ajustes/fechas-bloqueadas-rango`, {
      fecha_inicio: fechaInicio, fecha_fin: fechaFin, motivo
    });
  }

  getFechasBloqueadasPorSucursal(sucursalId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/ajustes/fechas-bloqueadas/sucursal/${sucursalId}`);
  }


  recuperarPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.api}/auth/recuperar-password`, { email });
  }
}


