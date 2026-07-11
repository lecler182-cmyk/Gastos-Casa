/**
 * Colores de categoría validados para fondo oscuro (contraste y
 * daltonismo verificados). Mapea los colores originales guardados en la
 * base de datos a su equivalente seguro; si el color no está en el mapa
 * (categoría creada por el usuario), se usa tal cual.
 */
const DARK_SAFE: Record<string, string> = {
  "#22c55e": "#008300",
  "#3b82f6": "#3987e5",
  "#eab308": "#c98500",
  "#f97316": "#d95926",
  "#a855f7": "#9085e9",
  "#ef4444": "#e66767",
  "#14b8a6": "#199e70",
  "#ec4899": "#d55181",
  "#6366f1": "#86b6ef",
  "#64748b": "#898781",
  "#8884d8": "#9085e9",
};

export function chartColor(hex: string | null | undefined): string {
  if (!hex) return "#898781";
  return DARK_SAFE[hex.toLowerCase()] ?? hex;
}
