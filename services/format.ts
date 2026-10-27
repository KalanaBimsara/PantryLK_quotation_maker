// Formato único de medidas en mm para pantalla e impresión.
// Enteros tal cual; medidas fraccionarias (puertas de medio mm, tercios de frentes) con un decimal,
// para que el plano, la leyenda impresa y el CSV muestren lo mismo.
export const fmtMm = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));
