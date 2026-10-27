import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Axe, Calculator, AlertTriangle, Layers } from 'lucide-react';
import { Piece, Settings, OptimizationResult } from './types';
import { optimizeCuts } from './services/optimizer';
import {
  loadStoredPieces,
  saveStoredPieces,
  loadStoredSettings,
  saveStoredSettings,
  loadStoredDarkMode,
  saveStoredDarkMode,
} from './services/storage';

import { Navbar } from './components/Navbar';
import { SettingsPanel } from './components/SettingsPanel';
import { PieceList } from './components/PieceList';
import { StatsSummary } from './components/StatsSummary';
import { Visualizer } from './components/Visualizer';
import { InventoryView } from './components/InventoryView';
import { useLanguage } from './contexts/LanguageContext';

export type ViewState = 'optimizer' | 'inventory';

const App: React.FC = () => {
  // 1. Estado persistido
  const [darkMode, setDarkMode] = useState<boolean>(() => loadStoredDarkMode());
  const [settings, setSettings] = useState<Settings>(() => loadStoredSettings());
  const [pieces, setPieces] = useState<Piece[]>(() => loadStoredPieces());
  const [currentView, setCurrentView] = useState<ViewState>('optimizer');
  
  const { t, language } = useLanguage();

  // 2. Resultados de optimización
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // 3. Sincronización visual (Hover bidireccional)
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);

  // Sincronizar clase 'dark' en el documento HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveStoredDarkMode(darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Persistir settings y piezas ante cualquier cambio
  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  const handlePiecesChange = (newPieces: Piece[]) => {
    setPieces(newPieces);
    saveStoredPieces(newPieces);
  };

  // Ejecución del Optimizador Multi-Pass
  const handleOptimize = useCallback(() => {
    setIsOptimizing(true);

    // Timeout breve para permitir que el spinner de React se renderice fluidamente
    setTimeout(() => {
      const outcome = optimizeCuts(pieces, settings);
      setResult(outcome);
      setIsOptimizing(false);
    }, 60);
  }, [pieces, settings]);

  // Optimización automática al montar o cambiar configuraciones
  useEffect(() => {
    handleOptimize();
  }, [handleOptimize]);

  const handleExportPDF = () => {
    window.print();
  };

  const autoFrontAreaSqFt = useMemo(() => {
    let area = 0;
    const processed = new Set<string>();
    pieces.forEach((p) => {
      if (p.groupId && p.cabinetWidth && p.cabinetHeight && !processed.has(p.groupId)) {
        processed.add(p.groupId);
        area += (p.cabinetWidth / 304.8) * (p.cabinetHeight / 304.8);
      }
    });
    return Number(area.toFixed(2));
  }, [pieces]);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-800'
      }`}
    >
      {/* Barra de Navegación Superior */}
      <Navbar 
        darkMode={darkMode} 
        onToggleDarkMode={toggleDarkMode} 
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Encabezado técnico movido al Visualizer para que cada hoja tenga su header */}

      <main className="max-w-7xl mx-auto p-4 lg:p-8 print:p-0">
        {currentView === 'optimizer' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
            {/* Columna Izquierda: Entradas y Configuración */}
            <div className="lg:col-span-5 space-y-5 no-print">
              {/* Panel de Parámetros del Tablero */}
              <SettingsPanel
                settings={settings}
                onChange={handleSettingsChange}
                darkMode={darkMode}
                autoFrontAreaSqFt={autoFrontAreaSqFt}
              />

              {/* Tabla de Piezas */}
              <PieceList
                pieces={pieces}
                onChange={handlePiecesChange}
                darkMode={darkMode}
                hoveredPieceId={hoveredPieceId}
                onHoverPiece={setHoveredPieceId}
              />

              {/* Botón Principal de Optimización */}
              <button
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-5 rounded-2xl shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              >
                {isOptimizing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('calculating')}</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    <span>{t('optimizeCuts')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Columna Derecha: Estadísticas y Visualización de Tableros */}
            <div className="lg:col-span-7 space-y-5 print:space-y-0 print:block">
              {/* Resumen de Estadísticas */}
              <StatsSummary
                result={result}
                settings={settings}
                darkMode={darkMode}
                onExportPDF={handleExportPDF}
              />

              {/* Planos de Corte y Visualizadores */}
              <div
                className={`rounded-2xl shadow-sm border p-5 min-h-[460px] transition-colors duration-200 print:shadow-none print:border-0 print:p-0 print:min-h-0 print:block ${
                  darkMode ? 'bg-gray-800/80 border-gray-700/80' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700 no-print">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('cuttingPlans')} ({result?.boards.length || 0} {t('boards')})
                    </h2>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {t('dragToMove')}
                  </span>
                </div>

                {result && result.boards.length > 0 ? (
                  <div className="space-y-6 print:space-y-0 print:block">
                    {result.boards.map((board, index) => (
                      <Visualizer
                        key={board.id}
                        board={board}
                        kerf={settings.kerf}
                        darkMode={darkMode}
                        hoveredPieceId={hoveredPieceId}
                        onHoverPiece={setHoveredPieceId}
                        jobNumber={settings.jobNumber}
                        boardIndex={index + 1}
                        totalBoards={result.boards.length}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 text-center">
                    <Axe className="w-12 h-12 mb-3 opacity-40 text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      {t('readyToOptimize')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                      {t('loadPiecesMsg')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <InventoryView darkMode={darkMode} />
        )}
      </main>

      {/* Footer removido para evitar hojas extra en impresión */}
    </div>
  );
};

export default App;