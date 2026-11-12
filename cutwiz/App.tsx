import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Axe, Layers } from 'lucide-react';
import { Piece, Settings } from './types';
import { exportOptimizationCSV } from './services/csvHelper';
import { MaterialPlan, boardKey, boardsToBuy, planByMaterial } from './services/materialPlan';
import { boardTitle } from './services/materials';
import { countExtraBoards } from './services/cabinetPieces';
import {
  loadStoredPieces,
  saveStoredPieces,
  loadStoredSettings,
  saveStoredSettings,
  loadStoredDarkMode,
  saveStoredDarkMode,
  EXAMPLE_PIECES,
} from './services/storage';

import { Navbar } from './components/Navbar';
import { SettingsPanel } from './components/SettingsPanel';
import { PieceList } from './components/PieceList';
import { StatsSummary } from './components/StatsSummary';
import { Visualizer } from './components/Visualizer';
import { InventoryView } from './components/InventoryView';
import { JobBar } from './components/JobBar';
import { CabinetBuilder } from './components/CabinetBuilder';
import { SettingsDrawer } from './components/SettingsDrawer';
import { useLanguage } from './contexts/LanguageContext';

export type ViewState = 'optimizer' | 'inventory';

const App: React.FC = () => {
  // 1. Estado persistido
  const [darkMode, setDarkMode] = useState<boolean>(() => loadStoredDarkMode());
  const [settings, setSettings] = useState<Settings>(() => loadStoredSettings());
  const [pieces, setPieces] = useState<Piece[]>(() => loadStoredPieces());
  const [currentView, setCurrentView] = useState<ViewState>('optimizer');
  
  const { t, language } = useLanguage();

  // 2. Resultados de optimización: un plan por tipo de tablero
  const [plans, setPlans] = useState<MaterialPlan[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

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

  // Optimización automática (Multi-Pass) al montar o cambiar piezas/ajustes.
  // El pequeño retraso agrupa cambios seguidos (p. ej. al escribir medidas).
  useEffect(() => {
    const timer = setTimeout(() => setPlans(planByMaterial(pieces, settings)), 60);
    return () => clearTimeout(timer);
  }, [pieces, settings]);

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (plans) exportOptimizationCSV(plans);
  };

  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  // Solo los tipos de tablero que llegaron a usar alguna hoja
  const drawnPlans = useMemo(() => (plans ?? []).filter((plan) => plan.result.boards.length > 0), [plans]);
  const hasPlan = drawnPlans.length > 0;
  const drawnBoards = drawnPlans.reduce((sum, plan) => sum + plan.result.boards.length, 0);

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

  // Tableros 8x4 extra para cajones (no forman parte del plan de corte)
  const extraBoards = useMemo(() => countExtraBoards(pieces), [pieces]);

  // Lista de compra para la primera hoja impresa: una línea por tipo de tablero
  const carcassName = t('materialCarcass');
  const buyLines = useMemo(
    () =>
      boardsToBuy(plans ?? [], settings, extraBoards).map(
        (row) => `${boardTitle(row.material, row.boardWidth, row.boardHeight, carcassName)}: ${row.total}`
      ),
    [plans, settings, extraBoards, carcassName]
  );

  // groupId → nombre del gabinete, para los tooltips del plan de corte
  const groupNames = useMemo(() => {
    const names: Record<string, string> = {};
    pieces.forEach((p) => {
      if (p.groupId && p.groupName && !names[p.groupId]) names[p.groupId] = p.groupName;
    });
    return names;
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
          <div className="space-y-5 print:space-y-0">
            {/* Barra del trabajo: nombre, tablero y acciones */}
            <JobBar
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onOpenSettings={() => setSettingsOpen(true)}
              onPrint={handleExportPDF}
              onExportCsv={handleExportCsv}
              canExport={hasPlan}
              darkMode={darkMode}
            />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
            {/* Columna Izquierda: armar el trabajo */}
            <div className="lg:col-span-5 space-y-5 no-print">
              {/* Agregar gabinete (estándar o a medida) */}
              <CabinetBuilder
                darkMode={darkMode}
                onAdd={(newPieces) => handlePiecesChange([...pieces, ...newPieces])}
              />

              {/* Lista de corte agrupada por gabinete */}
              <PieceList
                pieces={pieces}
                onChange={handlePiecesChange}
                darkMode={darkMode}
                hoveredPieceId={hoveredPieceId}
                onHoverPiece={setHoveredPieceId}
              />
            </div>

            {/* Columna Derecha: Estadísticas y Visualización de Tableros */}
            <div className="lg:col-span-7 space-y-5 print:space-y-0 print:block">
              {/* Resumen de Estadísticas */}
              <StatsSummary
                plans={plans}
                settings={settings}
                darkMode={darkMode}
                extraBoards={extraBoards}
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
                      {t('cuttingPlans')} ({drawnBoards} {t('boards')})
                    </h2>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {t('dragToMove')}
                  </span>
                </div>

                {hasPlan ? (
                  <div className="space-y-6 print:space-y-0 print:block">
                    {drawnPlans.map((plan, planIndex) => {
                      const boards = plan.result.boards;
                      const title = boardTitle(plan.material, plan.boardWidth, plan.boardHeight, carcassName);
                      return (
                        <section key={plan.material} aria-label={title} className="print:block">
                          {/* Encabezado del tipo de tablero; en papel cada hoja lleva su propio título */}
                          <h3 className="no-print mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">
                            {title} · {boards.length} {boards.length === 1 ? t('boardSingular') : t('boardPlural')}
                          </h3>
                          {boards.map((board, index) => (
                            <Visualizer
                              key={boardKey(plan.material, board.id)}
                              board={board}
                              kerf={settings.kerf}
                              darkMode={darkMode}
                              hoveredPieceId={hoveredPieceId}
                              onHoverPiece={setHoveredPieceId}
                              jobNumber={settings.jobNumber}
                              boardIndex={index + 1}
                              totalBoards={boards.length}
                              groupNames={groupNames}
                              title={title}
                              buyLines={planIndex === 0 && index === 0 ? buyLines : undefined}
                            />
                          ))}
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 text-center">
                    <Axe className="w-12 h-12 mb-3 opacity-40 text-blue-500" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      {t('planEmpty')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                      {t('planEmptyHint')}
                    </p>
                    {pieces.length === 0 && (
                      <button
                        type="button"
                        onClick={() => handlePiecesChange(EXAMPLE_PIECES)}
                        className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      >
                        {t('loadExample')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        ) : (
          <InventoryView darkMode={darkMode} />
        )}
      </main>

      {/* Ajustes del trabajo en panel lateral */}
      <SettingsDrawer open={settingsOpen} onClose={closeSettings} darkMode={darkMode}>
        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          darkMode={darkMode}
          autoFrontAreaSqFt={autoFrontAreaSqFt}
        />
      </SettingsDrawer>

      {/* Footer removido para evitar hojas extra en impresión */}
    </div>
  );
};

export default App;