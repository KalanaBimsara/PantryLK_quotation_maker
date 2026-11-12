import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, Layers, Ruler, Sparkles, CheckCircle2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { MaterialId, Settings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../contexts/translations';
import { fmtMm } from '../services/format';
import { MATERIAL_THICKNESS } from '../services/cabinetSeries';
import { MATERIAL_NAMES, boardFor, boardTitle, sheetLabel } from '../services/materials';
import { MaterialPlan, boardsCost, boardsToBuy, summarizePlans, unpricedMaterials } from '../services/materialPlan';

interface StatsSummaryProps {
  plans: MaterialPlan[] | null;
  settings: Settings;
  darkMode: boolean;
  extraBoards: number;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500';

// Qué piezas van en cada tipo de tablero
const USES_KEYS: Record<MaterialId, TranslationKey> = {
  carcass: 'usesCarcass',
  agt: 'usesAgt',
  hmr: 'usesHmr',
};

// Color de la etiqueta de espesor por tipo de tablero
const TAG_CLASS: Record<MaterialId, string> = {
  carcass: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  agt: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  hmr: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
};

// Resumen del panel derecho: aviso de piezas que no caben, tableros a comprar por tipo, cifras clave y "Más"
export const StatsSummary: React.FC<StatsSummaryProps> = ({ plans, settings, darkMode, extraBoards }) => {
  const { t } = useLanguage();
  const [showMore, setShowMore] = useState(false);

  if (!plans) return null;

  const carcassName = t('materialCarcass');
  const rows = boardsToBuy(plans, settings, extraBoards);
  const totals = summarizePlans(plans);

  // Aviso arriba del todo: también se muestra cuando ninguna pieza cabe (sin tableros)
  const unplacedWarning = totals.unplaced.length > 0 && (
    <div
      role="alert"
      className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs"
    >
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>{t('unplacedWarning')}</span>
      </div>
      <ul className="mt-1.5 ml-6 list-disc space-y-0.5">
        {totals.unplaced.map(({ piece, material }, i) => {
          const board = boardFor(settings, material);
          return (
            <li key={`${piece.id}-${i}`}>
              {piece.name} · {fmtMm(piece.width)} × {fmtMm(piece.height)} mm · {boardTitle(material, board.width, board.height, carcassName)}
            </li>
          );
        })}
      </ul>
    </div>
  );

  if (rows.length === 0) return unplacedWarning ? <div className="no-print">{unplacedWarning}</div> : null;

  // Área frontal automática: una vez por gabinete
  let autoFrontAreaSqFt = 0;
  const processedGroups = new Set<string>();
  plans.forEach((plan) => {
    plan.result.boards.forEach((board) => {
      board.placedPieces.forEach((piece) => {
        if (piece.groupId && piece.cabinetWidth && piece.cabinetHeight && !processedGroups.has(piece.groupId)) {
          processedGroups.add(piece.groupId);
          autoFrontAreaSqFt += (piece.cabinetWidth / 304.8) * (piece.cabinetHeight / 304.8);
        }
      });
    });
  });

  const edgeBandPrice = settings.edgeBandPricePerM ?? 60;
  const machineRentPrice = settings.machineRentPerSqFt ?? 500;
  const laborPrice = settings.laborPerSqFt ?? 850;

  // Use user input if provided, otherwise use auto-calculated area
  const frontArea = settings.frontAreaSqFt || autoFrontAreaSqFt;

  // Cada tipo de tablero con su precio; los tableros extra de cajones ya vienen en la fila de estructura
  const totalCost =
    boardsCost(rows, settings) +
    totals.edgeBandMeters * edgeBandPrice +
    frontArea * machineRentPrice +
    frontArea * laborPrice;

  const totalToBuy = rows.reduce((sum, row) => sum + row.total, 0);

  // Tableros sin precio: no entran en el costo total, y se avisa en su fila y junto al total
  const unpriced = unpricedMaterials(rows, settings);
  const nameOf = (material: MaterialId) => (material === 'carcass' ? carcassName : MATERIAL_NAMES[material]);

  const card = (tone: string) =>
    `p-4 rounded-2xl border transition-all ${tone}`;
  const neutral = darkMode ? 'bg-gray-750/50 border-gray-700' : 'bg-gray-50/80 border-gray-200';
  const panel = `rounded-2xl shadow-sm border p-4 transition-colors duration-200 ${
    darkMode ? 'bg-gray-800/80 border-gray-700/80 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
  }`;

  return (
    <div className="no-print space-y-3">
      {unplacedWarning}

      {/* Tableros a comprar, por tipo */}
      <section className={panel} aria-labelledby="boards-to-buy-title">
        <div className="flex items-center gap-2 pb-3">
          <Layers className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden="true" />
          <h2 id="boards-to-buy-title" className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('boardsToBuy')}
          </h2>
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {t('boardsInTotal').replace('{n}', String(totalToBuy))}
          </span>
        </div>

        <ul>
          {rows.map((row) => {
            const label = sheetLabel(row.boardWidth, row.boardHeight);
            const size = `${fmtMm(row.boardWidth)} × ${fmtMm(row.boardHeight)} mm`;
            return (
              <li
                key={row.material}
                className="flex items-center justify-between gap-4 py-2.5 border-t border-gray-100 dark:border-gray-700"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <span>{nameOf(row.material)}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${TAG_CLASS[row.material]}`}>
                      {MATERIAL_THICKNESS[row.material]} mm
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {label ? `${label} · ${size}` : size} · {t(USES_KEYS[row.material])}
                  </div>
                  {unpriced.includes(row.material) && (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                      {t('priceNotSet')}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-extrabold leading-tight text-blue-600 dark:text-blue-400">{row.total}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    {row.extra > 0
                      ? t('cutAndDrawers').replace('{cut}', String(row.cut)).replace('{extra}', String(row.extra))
                      : row.total === 1
                        ? t('boardSingular')
                        : t('boardPlural')}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className={panel}>
        {/* Cifras clave, sumando todos los tipos de tablero */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={card(darkMode ? 'bg-green-950/20 border-green-800/60' : 'bg-green-50/70 border-green-200')}>
            <div className="flex items-center gap-2 text-xs font-semibold text-green-700 dark:text-green-300 mb-1.5">
              <TrendingUp className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{t('yield')}</span>
            </div>
            <div className="text-2xl font-extrabold text-green-700 dark:text-green-400">{totals.efficiency.toFixed(1)}%</div>
          </div>

          <div className={card(neutral)}>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" aria-hidden="true" />
              <span>{t('parts')}</span>
            </div>
            <div className="text-2xl font-extrabold text-gray-800 dark:text-gray-100">{totals.totalParts}</div>
          </div>

          <div className={card(darkMode ? 'bg-indigo-950/20 border-indigo-800/60' : 'bg-indigo-50/70 border-indigo-200')}>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1.5">
              <span className="text-[13px] font-black font-mono tracking-tight" aria-hidden="true">Rs</span>
              <span>{t('totalCost')}</span>
            </div>
            <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400">
              {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {unpriced.length > 0 && (
              <div className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                {t('costWithout').replace('{boards}', unpriced.map(nameOf).join(', '))}
              </div>
            )}
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
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{totals.waste.toFixed(1)}%</div>
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
                {totals.linearCuts} <span className="text-sm font-semibold">m</span>
              </div>
            </div>

            <div className={card(neutral)}>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                <Sparkles className="w-4 h-4 text-teal-500 flex-shrink-0" aria-hidden="true" />
                <span>{t('usefulOffcuts')}</span>
              </div>
              <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">{totals.usefulOffcuts}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
