// src/app/models/cita.model.ts

export interface Paciente {
  id: number;
  nombre: string;
  sucursal: string;
  sucursal_id: number;
}

export interface CitaHistorial {
  fecha: string;
  hora: string;
  tratamiento: string;
  subtratamiento: string;
  motivo: string;
  sucursal_id: number;
  sucursal_nombre: string;
  paciente_nombre: string;
}

export interface Prediccion {
  fecha: string;          // 'YYYY-MM-DD'
  hora: string;           // 'HH:MM'
  tratamiento: string;
  subtratamiento: string;
  motivo: string;
  confianza: number;      // 0-100
  sucursal_id: number;    // 1 o 2
  sucursal_nombre: string;
  paciente_nombre: string;
  paciente_id?: number;
}

export interface ModeloArbol {
  tratamiento: string;
  subtratamiento: string;
  intervalo: number;
  horaFrecuente: string;
  confianza: number;
}

export interface PrediccionResponse {
  predicciones: Prediccion[];
  modelo: ModeloArbol | null;
}

export interface DiaCelda {
  numero:       number | null;
  fecha:        string | null;
  esHoy:        boolean;
  esPasado:     boolean;
  predicciones: Prediccion[];
  confirmadas:  CitaConfirmada[];
}

export interface MesCalendario {
  anio: number;
  mes: number;
  nombre: string;
  semanas: DiaCelda[][];
}

export interface Tratamiento {
  tratamiento_id:    number;
  tratamiento:       string;
  subtratamiento_id: number;
  subtratamiento:    string;
  intervalo_dias:    number;
}

export interface Doctor {
  id:          number;
  nombre:      string;
  especialidad: string;
}

export interface ConfirmarCitaRequest {
  paciente_id:       number;
  sucursal_id:       number;
  tratamiento_id:    number;
  subtratamiento_id: number;
  doctor_id?:        number | null;
  fecha:             string;
  hora:              string;
  motivo:            string;
  notas?:            string;
}

export interface ConfirmarCitaResponse {
  mensaje: string;
  cita:    any;
}

export interface CitaConfirmada {
  id:              number;
  fecha:           string;
  hora:            string;
  tratamiento:     string;
  subtratamiento:  string;
  motivo:          string;
  notas?:          string;
  sucursal_id:     number;
  sucursal_nombre: string;
  paciente_id:     number;
  paciente_nombre: string;
  tipo:            'confirmada';
  confianza:       100;
}

export interface CalendarioResponse {
  predicciones: Prediccion[];
  confirmadas:  CitaConfirmada[];
}
