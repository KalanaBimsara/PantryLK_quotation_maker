import { Piece, OptimizationResult } from '../types';
import { fmtMm } from './format';

/**
 * Detecta el delimitador más probable en un texto CSV (, o ; o tab)
 */
const detectDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  return ',';
};

/**
 * Parsea un archivo CSV de piezas con tolerancia a diferentes formatos de columnas
 */
export const parsePiecesCSV = (content: string): Piece[] => {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(content);
  // Se ignoran comillas y sufijos de unidad como "(mm)" para que las cabeceras exportadas se puedan reimportar
  const header = lines[0]
    .toLowerCase()
    .split(delimiter)
    .map((h) => h.trim().replace(/^["']|["']$/g, '').replace(/\s*\(.*?\)\s*$/, '').trim());

  // Índices de columnas
  let widthIdx = -1;
  let heightIdx = -1;
  let qtyIdx = -1;
  let nameIdx = -1;
  let rotateIdx = -1;

  header.forEach((col, idx) => {
    if (/^(ancho|width|w|x|largo|longitud)$/i.test(col) && widthIdx === -1) {
      widthIdx = idx;
    } else if (/^(alto|height|h|y|profundidad)$/i.test(col) && heightIdx === -1) {
      heightIdx = idx;
    } else if (/^(cant|cantidad|qty|quantity|count)$/i.test(col)) {
      qtyIdx = idx;
    } else if (/^(nombre|name|pieza|label|etiqueta|desc|descripcion)$/i.test(col)) {
      nameIdx = idx;
    } else if (/^(rotar|rotacion|rotacion libre|canrotate|can rotate|rotate|girar|veta)$/i.test(col)) {
      rotateIdx = idx;
    }
  });

  // Si no hay cabecera explícita, asumir columnas estándar: [Ancho, Alto, Cantidad, Nombre, Rotar]
  const startIndex = (widthIdx !== -1 && heightIdx !== -1) ? 1 : 0;
  if (widthIdx === -1) widthIdx = 0;
  if (heightIdx === -1) heightIdx = 1;
  if (qtyIdx === -1) qtyIdx = 2;
  if (nameIdx === -1) nameIdx = 3;

  const parsedPieces: Piece[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const rawCols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (rawCols.length < 2) continue;

    const w = parseFloat(rawCols[widthIdx]?.replace(',', '.') || '0');
    const h = parseFloat(rawCols[heightIdx]?.replace(',', '.') || '0');
    const qty = qtyIdx !== -1 && rawCols[qtyIdx] ? parseInt(rawCols[qtyIdx], 10) : 1;
    const name = nameIdx !== -1 && rawCols[nameIdx] ? rawCols[nameIdx] : `Part ${parsedPieces.length + 1}`;

    let canRotate = true;
    if (rotateIdx !== -1 && rawCols[rotateIdx]) {
      const rotVal = rawCols[rotateIdx].toLowerCase();
      if (rotVal === '0' || rotVal === 'no' || rotVal === 'false' || rotVal === 'veta') {
        canRotate = false;
      }
    }

    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      parsedPieces.push({
        id: `csv-${Date.now()}-${i}`,
        name,
        // Se conserva hasta 0,1 mm (puertas de medio mm, tercios de frentes de cajón)
        width: Math.round(w * 10) / 10,
        height: Math.round(h * 10) / 10,
        quantity: Math.max(1, isNaN(qty) ? 1 : qty),
        canRotate,
      });
    }
  }

  return parsedPieces;
};

/**
 * Exporta el resultado de optimización a CSV con coordenadas y detalles de taller
 */
export const buildOptimizationCSV = (result: OptimizationResult): string => {
  let csv = 'Board,Part,Description,Width (mm),Height (mm),X (mm),Y (mm),Rotated 90°,Color\n';

  result.boards.forEach((board) => {
    board.placedPieces.forEach((p) => {
      const name = (p.name || 'Unnamed').replace(/,/g, ' ');
      csv += `${board.id},${p.originalId},"${name}",${fmtMm(p.w)},${fmtMm(p.h)},${Math.round(p.x)},${Math.round(p.y)},${p.isRotated ? 'YES' : 'NO'},${p.color}\n`;
    });
  });

  return csv;
};

export const exportOptimizationCSV = (result: OptimizationResult): void => {
  if (!result || result.boards.length === 0) return;
  downloadCSV(buildOptimizationCSV(result), `cutwizard_plan_${new Date().toISOString().slice(0, 10)}.csv`);
};

/**
 * Exporta la lista de piezas cargadas
 */
export const buildPiecesListCSV = (pieces: Piece[]): string => {
  let csv = 'Name,Width (mm),Height (mm),Quantity,Can rotate\n';
  pieces.forEach((p) => {
    const name = (p.name || 'Part').replace(/,/g, ' ');
    csv += `"${name}",${fmtMm(p.width)},${fmtMm(p.height)},${p.quantity},${p.canRotate ? 'YES' : 'NO'}\n`;
  });
  return csv;
};

export const exportPiecesListCSV = (pieces: Piece[]): void => {
  if (pieces.length === 0) return;
  downloadCSV(buildPiecesListCSV(pieces), `cutwizard_parts_${new Date().toISOString().slice(0, 10)}.csv`);
};

const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
