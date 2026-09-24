export interface RegistrationData {
  nombreCompleto: string;
  nombre: string;
  apellido: string;
  programas: string[];
  correo: string;
  celular: string;
}

export interface SubmissionResult {
  timestamp: string;
  nombreCompleto: string;
  nombre: string;
  apellido: string;
  programas: string[];
  correo: string;
  celular: string;
  sheetsSaved: boolean;
  sheetsUrl?: string;
  userEmailSent: boolean;
  adminEmailSent: boolean;
  error?: string;
}

export interface AdminConfig {
  adminEmail: string;
  spreadsheetId?: string;
  autoSync: boolean;
}

export const PROGRAM_OPTIONS = [
  { id: 'maestria', label: 'Maestría', category: 'Posgrado' },
  { id: 'doctorado', label: 'Doctorado', category: 'Posgrado' },
  { id: 'especializacion', label: 'Especialización', category: 'Posgrado' },
  { id: 'licenciatura', label: 'Licenciatura', category: 'Pregrado' },
  { id: 'licenciatura_usa', label: 'Licenciatura para terminar en USA', category: 'Pregrado Internacional' },
  { id: 'diplomados', label: 'Diplomados', category: 'Educación Continua' },
  { id: 'seminarios', label: 'Seminarios', category: 'Educación Continua' },
  { id: 'cursos', label: 'Cursos', category: 'Educación Continua' },
  { id: 'ingles_adultos', label: 'Cursos de inglés para adultos', category: 'Idiomas' },
  { id: 'ingles_ninos', label: 'Cursos de inglés para niños', category: 'Idiomas' },
  { id: 'escuela_ninos', label: 'Escuela para niños (maternal a 6 grado)', category: 'Escuela QLU' }
] as const;
