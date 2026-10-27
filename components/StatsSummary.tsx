import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, Layers, Ruler, Sparkles, CheckCircle2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { OptimizationResult, Settings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { fmtMm } from '../services/format';

interface StatsSummaryProps {
  result: OptimizationResult | null;
  settings: Settings;
  darkMode: boolean;
  extraBoards: number;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500';

// Resumen del panel derecho: aviso de piezas que no caben, 4 cifras clave y "Más" con el resto
export const StatsSummary: React.FC<StatsSummaryProps> = ({ result, settings, darkMode, extraBoards }) => {
  const { t } = useLanguage();
  const [showMore, setShowMore] = useState(false);

  if (!result) return null;

  const hasBoards = result.boards.length > 0;
  const unplaced = result.unplacedPieces;

  // Aviso arriba del todo: también se muestra cuando ninguna pieza cabe (sin tableros)
  const unplacedWarning = unplaced.length > 0 && (
    <div
      role="alert"
      className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs"
    >
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>{t('unplacedWarning')}</span>
      </div>
      <ul className="mt-1.5 ml-6 list-disc space-y-0.5">
        {unplaced.map((p, i) => (
          <li key={`${p.id}-${i}`}>
            {p.name} · {fmtMm(p.width)} × {fmtMm(p.height)} mm
          </li>
        ))}
      </ul>
    </div>
  );

  if (!hasBoards) return unplaced.length > 0 ? <div className="no-print">{unplacedWarning}</div> : null;

  const usefulOffcutsTotal = result.boards.reduce((acc, b) => acc + (b.usefulOffcutsCount || 0), 0);

  // Calcular perímetro total para tapacantos (edge banding)
  let edgeBandMeters = 0;
  let autoFrontAreaSqFt = 0;
  const processedGroups = new Set<string>();

  result.boards.forEach((board) => {
    board.placedPieces.forEach((piece) => {
      edgeBandMeters += (2 * (piece.w + piece.h)) / 1000;

      // Área frontal automática: una vez por gabinete
      if (piece.groupId && piece.cabinetWidth && piece.cabinetHeight && !processedGroups.has(piece.groupId)) {
        processedGroups.add(piece.groupId);
        autoFrontAreaSqFt += (piece.cabinetWidth / 304.8) * (piece.cabinetHeight / 304.8);
      }
    });
  });

  const edgeBandPrice = settings.edgeBandPricePerM ?? 60;
  const machineRentPrice = settings.machineRentPerSqFt ?? 500;
  const laborPrice = settings.laborPerSqFt ?? 850;
  const boardPrice = settings.boardPrice || 0;

  // Use user input if provided, otherwise use auto-calculated area
  const frontArea = settings.frontAreaSqFt || autoFrontAreaSqFt;

  // Los tableros extra de cajones se compran aparte del plan de corte
  const totalCost =
    (result.totalBoards + extraBoards) * boardPrice +
    edgeBandMeters * edgeBandPrice +
    frontArea * machineRentPrice +
    frontArea * laborPrice;

  const card = (tone: string) =>
    `p-4 rounded-2xl border transition-all ${tone}`;
  const neutral = darkMode ? 'bg-gray-750/50 border-gray-700' : 'bg-gray-50/80 border-gray-200';

  return (
    <div className="no-print space-y-3">
      {unplacedWarning}

      <div
        className={`rounded-2xl shadow-sm border p-4 transition-colors duration-200 ${
          darkMode ? 'bg-gray-800/80 border-gray-700/80 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
        }`}
      >
        {/* Cifras clave */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className={card(darkMode ? 'bg-blue-950/20 border-blue-800/60' : 'bg-blue-50/70 border-blue-200')}>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">
              <Layers className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{t('boards')}</span>
            </div>
            <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              {result.totalBoards}
              {extraBoards > 0 && (
                <span className="ml-1.5 text-xs font-semibold text-blue-500 dark:text-blue-300">
                  + {extraBoards} {t('forDrawers')}
                </span>
              )}
            </div>
          </div>

          <div className={card(darkMode ? 'bg-green-950/20 border-green-800/60' : 'bg-green-50/70 border-green-200')}>
            <div className="flex items-center gap-2 text-xs font-semibold text-green-700 dark:text-green-300 mb-1.5">
              <TrendingUp className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{t('yield')}</span>
            </div>
            <div className="text-2xl font-extrabold text-green-700 dark:text-green-400">{result.totalEfficiency.toFixed(1)}%</div>
          </div>

          <div className={card(neutral)}>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" aria-hidden="true" />
              <span>{t('parts')}</span>
            </div>
            <div className="text-2xl font-extrabold text-gray-800 dark:text-gray-100">{result.totalPartsCount}</div>
          </div>

          <div className={card(darkMode ? 'bg-indigo-950/20 border-indigo-800/60' : 'bg-indigo-50/70 border-indigo-200')}>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1.5">
              <span className="text-[13px] font-black font-mono tracking-tight" aria-hidden="true">Rs</span>
              <span>{t('totalCost')}</span>
            </div>
            <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400">
              {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Más cifras */}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className={`mt-3 flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded ${FOCUS}`}
        >
          {showMore ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
          {showMore ? t('less') : t('more')}
        </button>

        {showMore && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className={card(darkMode ? 'bg-amber-950/20 border-amber-800/60' : 'bg-amber-50/70 border-amber-200')}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>{t('wasteTotal')}</span>
                <span className="cursor-help text-amber-700/60 dark:text-amber-300/60 p-0.5 inline-flex items-center">
                  <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{result.totalWaste.toFixed(1)}%</div>
            </div>

            <div className={card(neutral)}>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                <Ruler className="w-4 h-4 text-purple-500 flex-shrink-0" aria-hidden="true" />
                <span>{t('linearCut')}</span>
                <span className="cursor-help text-gray-500 dark:text-gray-400 p-0.5 inline-flex items-center">
                  <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
                {result.totalLinearCuts} <span className="text-sm font-semibold">m</span>
              </div>
            </div>

            <div className={card(neutral)}>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                <Sparkles className="w-4 h-4 text-teal-500 flex-shrink-0" aria-hidden="true" />
                <span>{t('usefulOffcuts')}</span>
              </div>
              <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">{usefulOffcutsTotal}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
