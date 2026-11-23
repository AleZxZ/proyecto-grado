export function fechaLocal(valor: string | Date): Date {
  const s = typeof valor === 'string' ? valor : valor.toISOString();
  const [y, m, d] = s.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}