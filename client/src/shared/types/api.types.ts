export interface ApiSuccess<T> {
  status: 'success';
  data: T;
}

// La API usa dos formas: el manejador global responde `message` y los
// controladores de cada módulo, `error`. El cliente acepta ambas.
export interface ApiError {
  status?: 'error';
  message?: string;
  error?: string;
}
