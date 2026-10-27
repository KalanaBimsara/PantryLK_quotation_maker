import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, RotateCw, Lock } from 'lucide-react';
import { Board, PlacedPiece } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface VisualizerProps {
  board: Board;
  kerf: number;
  darkMode: boolean;
  hoveredPieceId: string | null;
  onHoverPiece: (id: string | null) => void;
  jobNumber?: string;
  boardIndex?: number;
  totalBoards?: number;
  // groupId → nombre del gabinete, para el tooltip de cada pieza
  groupNames?: Record<string, string>;
  // Tableros 8x4 extra para cajones; se avisa en la hoja impresa del tablero 1
  extraBoards?: number;
}

// Nombre visible dentro de la pieza solo si hay sitio (en unidades del tablero, mm)
const NAME_MIN_W = 250;
const NAME_MIN_H = 120;

export const Visualizer: React.FC<VisualizerProps> = ({
  board,
  kerf,
  darkMode,
  hoveredPieceId,
  onHoverPiece,
  jobNumber,
  boardIndex,
  totalBoards,
  groupNames = {},
  extraBoards = 0,
}) => {
  const { width, height, placedPieces, freeRects, trimMargin = 0 } = board;
  const { t } = useLanguage();

  // Estados para Zoom y Pan interactivo
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [activePiece, setActivePiece] = useState<PlacedPiece | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Solo botón principal
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const maxDim = Math.max(width, height);
  const baseFontSize = Math.max(16, Math.round(maxDim / 55));
  const strokeWidth = Math.max(1, Math.round(maxDim / 1000));

  // Renderizador de cotas numéricas
  const renderDimensions = (x: number, y: number, w: number, h: number, isDarkPiece: boolean) => {
    const showW = w > baseFontSize * 2;
    const showH = h > baseFontSize * 2;
    if (!showW && !showH) return null;

    const textColor = darkMode ? '#f8fafc' : '#0f172a';
    const bgBadge = darkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)';

    return (
      <g className="pointer-events-none select-none">
        {showW && (
          <g>
            <rect
              x={x + w / 2 - (String(Math.round(w)).length * baseFontSize * 0.32)}
              y={y + baseFontSize * 0.3}
              width={String(Math.round(w)).length * baseFontSize * 0.64}
              height={baseFontSize * 1.1}
              rx={4}
              fill={bgBadge}
            />
            <text
              x={x + w / 2}
              y={y + baseFontSize * 1.1}
              textAnchor="middle"
              fontSize={baseFontSize * 0.85}
              fontWeight="600"
              fill={textColor}
            >
              {Math.round(w)}
            </text>
          </g>
        )}
        {showH && (
          <g>
            <rect
              x={x + baseFontSize * 0.2}
              y={y + h / 2 - (String(Math.round(h)).length * baseFontSize * 0.32)}
              width={baseFontSize * 1.1}
              height={String(Math.round(h)).length * baseFontSize * 0.64}
              rx={4}
              fill={bgBadge}
            />
            <text
              x={x + baseFontSize * 0.75}
              y={y + h / 2}
              textAnchor="middle"
              fontSize={baseFontSize * 0.85}
              fontWeight="600"
              fill={textColor}
              transform={`rotate(-90, ${x + baseFontSize * 0.75}, ${y + h / 2})`}
            >
              {Math.round(h)}
            </text>
          </g>
        )}
      </g>
    );
  };

  const pieceLegend = React.useMemo(() => {
    const counts = placedPieces.reduce((acc, p) => {
      const key = `${p.name || p.label}-${p.w}-${p.h}-${p.color}`;
      if (!acc[key]) {
        acc[key] = {
          name: p.name || p.label,
          color: p.color,
          w: p.w,
          h: p.h,
          count: 0,
        };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, {name: string, color: string, w: number, h: number, count: number}>);
    return Object.values(counts);
  }, [placedPieces]);

  return (
    <div
      className={`board-page w-full rounded-2xl shadow-sm border p-4 mb-6 transition-colors duration-200 print:shadow-none print:border-none print:mb-0 print:p-0 print:h-[185mm] print:flex print:flex-col ${
        darkMode ? 'bg-gray-800/90 border-gray-700/80 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
      }`}
    >
      {/* Encabezado técnico exclusivo para impresión por hoja */}
      <div className="hidden print:flex justify-between items-end mb-2 pb-2 border-b border-gray-400 text-black shrink-0">
        <div>
          <h1 className="text-base font-black tracking-tight">Pantry LK CutWIZ {jobNumber ? `- [${jobNumber}]` : ''}</h1>
          <p className="text-[10px] text-gray-600">
            {t('date')}: {new Date().toLocaleDateString()} | Board {boardIndex} of {totalBoards}
          </p>
        </div>
        <div className="text-right text-[9px] font-mono text-gray-700">
          <div>{t('bladeKerf')}: {kerf} mm</div>
          {boardIndex === 1 && extraBoards > 0 && (
            <div className="font-bold text-black">+ {extraBoards} {t('extraBoardsForDrawers')}</div>
          )}
        </div>
      </div>

      {/* Barra superior de placa */}
      <div className="flex flex-wrap justify-between items-center mb-3 pb-2 print:mb-1 print:pb-1 border-b border-gray-100 dark:border-gray-700 gap-2 print:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 print:text-black">
            {t('board')} #{board.id}
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300 print:bg-gray-100 print:text-black border border-transparent print:border-gray-300">
            {width} × {height} mm
          </span>
          {trimMargin > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 print:bg-white print:border-amber-500">
              {t('trimMargin')}: {trimMargin} mm
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {board.efficiency.toFixed(1)}%
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 print:text-gray-700">
            <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
            {board.waste.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Contenedor del Canvas SVG con Zoom y Pan */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full rounded-xl border overflow-hidden select-none cursor-grab active:cursor-grabbing transition-colors duration-200 print:border-gray-300 print:bg-white print:flex-1 print:!min-h-0 print:!max-h-none print:flex print:flex-col ${
          darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200'
        }`}
        style={{ minHeight: '420px', maxHeight: '65vh' }}
      >
        {/* Controles de Zoom Flotantes */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 p-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-gray-700 no-print">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-1 text-[11px] font-mono font-bold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tooltip informativo al pasar el cursor sobre una pieza */}
        {activePiece && (
          <div className="absolute bottom-3 left-3 z-10 p-2.5 bg-gray-900/95 text-white text-xs rounded-xl shadow-lg border border-gray-700 backdrop-blur-md pointer-events-none flex items-center gap-3 no-print">
            <div>
              <div className="font-bold text-blue-300">{activePiece.name || activePiece.label}</div>
              <div className="text-gray-300 text-[11px]">
                {activePiece.w} × {activePiece.h} mm | Pos: ({Math.round(activePiece.x)}, {Math.round(activePiece.y)})
              </div>
            </div>
            {activePiece.isRotated && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <RotateCw className="w-3 h-3" />
              </span>
            )}
          </div>
        )}

        {/* Canvas SVG transformable */}
        <div
          className="print:!transform-none print:!p-1 print:flex-1 print:flex print:items-center print:justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto block drop-shadow-xl print:drop-shadow-none print:max-h-full"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            <defs>
              <pattern
                id={`waste-pattern-${board.id}`}
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="20"
                  stroke={darkMode ? '#334155' : '#e2e8f0'}
                  strokeWidth="1.5"
                />
              </pattern>
            </defs>

            <rect
              x="0"
              y="0"
              width={width}
              height={height}
              fill={darkMode ? '#1e293b' : '#ffffff'}
              stroke={darkMode ? '#475569' : '#cbd5e1'}
              strokeWidth={strokeWidth * 2}
              rx={2}
            />

            {trimMargin > 0 && (
              <rect
                x={trimMargin}
                y={trimMargin}
                width={Math.max(0, width - trimMargin * 2)}
                height={Math.max(0, height - trimMargin * 2)}
                fill="none"
                stroke={darkMode ? '#64748b' : '#94a3b8'}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeWidth * 4} ${strokeWidth * 3}`}
              />
            )}

            {freeRects.map((rect, i) => {
              if (rect.w < 5 || rect.h < 5) return null;
              const isUseful = rect.w >= 300 && rect.h >= 300;

              return (
                <g key={`waste-${i}`}>
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    fill={isUseful ? (darkMode ? '#132e2b' : '#f0fdf4') : `url(#waste-pattern-${board.id})`}
                    stroke={isUseful ? '#10b981' : darkMode ? '#334155' : '#cbd5e1'}
                    strokeWidth={strokeWidth}
                    opacity={isUseful ? 0.9 : 0.6}
                  />
                  {renderDimensions(rect.x, rect.y, rect.w, rect.h, false)}
                </g>
              );
            })}

            {placedPieces.map((p) => {
              const isHighlighted = hoveredPieceId === p.originalId;

              return (
                <g
                  key={p.id}
                  onMouseEnter={() => {
                    setActivePiece(p);
                    onHoverPiece(p.originalId);
                  }}
                  onMouseLeave={() => {
                    setActivePiece(null);
                    onHoverPiece(null);
                  }}
                  className="cursor-pointer transition-opacity"
                >
                  <title>
                    {`${p.name || p.label} · ${p.w} × ${p.h} mm${p.groupId && groupNames[p.groupId] ? ` · ${groupNames[p.groupId]}` : ''}`}
                  </title>
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    fill={p.color}
                    stroke={isHighlighted ? '#2563eb' : darkMode ? '#0f172a' : '#1e293b'}
                    strokeWidth={isHighlighted ? strokeWidth * 4 : strokeWidth}
                    opacity={isHighlighted ? 1 : 0.92}
                    rx={2}
                    style={{
                      filter: isHighlighted ? 'drop-shadow(0 0 10px rgba(37,99,235,0.8))' : 'none',
                    }}
                  />
                  {renderDimensions(p.x, p.y, p.w, p.h, true)}

                  {/* Nombre de la pieza en el centro, si cabe */}
                  {p.name && p.w >= NAME_MIN_W && p.h >= NAME_MIN_H && (() => {
                    const fontSize = baseFontSize * 0.8;
                    const maxChars = Math.max(4, Math.floor((p.w - baseFontSize * 2) / (fontSize * 0.6)));
                    const text = p.name.length > maxChars ? `${p.name.slice(0, maxChars - 1)}…` : p.name;
                    return (
                      <text
                        x={p.x + p.w / 2}
                        y={p.y + p.h / 2}
                        fontSize={fontSize}
                        fill="#0f172a"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="pointer-events-none select-none font-semibold"
                      >
                        {text}
                      </text>
                    );
                  })()}

                  {p.isRotated && p.w > baseFontSize * 2 && p.h > baseFontSize * 2 && (
                    <text
                      x={p.x + p.w - baseFontSize * 1.2}
                      y={p.y + baseFontSize * 1.2}
                      fontSize={baseFontSize * 0.75}
                      fill={darkMode ? '#ffffff' : '#000000'}
                      opacity={0.65}
                      textAnchor="middle"
                      className="pointer-events-none select-none font-bold"
                    >
                      ⟳
                    </text>
                  )}
                </g>
              );
            })}

            <rect
              x="0"
              y="0"
              width={width}
              height={height}
              fill="none"
              stroke={darkMode ? '#94a3b8' : '#64748b'}
              strokeWidth={strokeWidth * 2.5}
            />
          </svg>
        </div>
      </div>

      {/* Item Mapping (Legend) for Print & Screen */}
      <div className="mt-4 print:mt-6 hidden print:block mb-4">
        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 border-b pb-1">Item Mapping</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          {pieceLegend.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 border-b border-gray-100 pb-1">
              <div 
                className="w-4 h-4 rounded border border-gray-300 print:border-black shrink-0" 
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="flex-1 font-semibold text-gray-900 truncate">
                {item.name}
              </div>
              <div className="text-gray-600 font-mono whitespace-nowrap">
                {item.w} × {item.h} mm
              </div>
              <div className="font-bold text-gray-900 bg-gray-100 px-1.5 rounded">
                x{item.count}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};