import React, { useMemo, useState } from 'react';
import { Box, Plus } from 'lucide-react';
import { Piece } from '../types';
import {
  CABINET_SERIES,
  STANDARD_WIDTHS,
  drawersAvailable,
  isStandardSize,
  standardSize,
  tryBuildCabinet,
  validateCabinetSize,
  CabinetPartKey,
  CabinetSeriesId,
  CabinetSize,
} from '../services/cabinetSeries';
import { createCabinetGroups, clampCabinetQuantity, MAX_CABINET_QUANTITY } from '../services/cabinetPieces';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../contexts/translations';
import { fmtMm } from '../services/format';
import { MATERIAL_NAMES } from '../services/materials';

const PART_NAME_KEYS: Record<CabinetPartKey, TranslationKey> = {
  bottom: 'partBottom',
  top: 'partTop',
  shelf: 'partShelf',
  side: 'partSide',
  back: 'partBack',
  topRail: 'partTopRail',
  backSupport: 'partBackSupport',
  door: 'partDoor',
  drawerFront: 'partDrawerFront',
};

const SERIES_NAME_KEYS: Record<CabinetSeriesId, TranslationKey> = {
  'deep-560': 'seriesDeep560',
  'shallow-300': 'seriesShallow300',
};

const FIELD_LABEL_KEYS: Record<keyof CabinetSize, TranslationKey> = {
  width: 'widthLabel',
  height: 'heightLabel',
  depth: 'depthLabel',
};

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500';

type CustomInput = Record<keyof CabinetSize, string>;

interface CabinetBuilderProps {
  darkMode: boolean;
  onAdd: (pieces: Piece[]) => void;
}

export const CabinetBuilder: React.FC<CabinetBuilderProps> = ({ darkMode, onAdd }) => {
  const { t } = useLanguage();
  const [seriesId, setSeriesId] = useState<CabinetSeriesId>('deep-560');
  const [mode, setMode] = useState<'standard' | 'custom'>('standard');
  const [width, setWidth] = useState<number>(600);
  const [custom, setCustom] = useState<CustomInput>({ width: '600', height: '750', depth: '560' });
  const [drawers, setDrawers] = useState<boolean>(false);
  // Texto crudo para poder borrar y reescribir el número; se limita al usarlo
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const quantity = clampCabinetQuantity(Number(quantityInput));

  const series = CABINET_SERIES.find((s) => s.id === seriesId)!;

  const size: CabinetSize =
    mode === 'standard'
      ? standardSize(seriesId, width)
      : { width: Number(custom.width), height: Number(custom.height), depth: Number(custom.depth) };

  // Campos vacíos o fuera de rango: se avisa debajo de cada uno
  const problems = mode === 'custom' ? validateCabinetSize(size) : [];
  const problemFor = (field: keyof CabinetSize) => problems.find((p) => p.field === field);

  const canHaveDrawers = problems.length === 0 && drawersAvailable(seriesId, size);
  // `drawers` guarda la intención del usuario y no se borra: mientras se escribe una medida
  // (p. ej. "9" camino de "900") puede no admitir cajones un instante. Lo que se usa es el
  // valor efectivo (drawers && canHaveDrawers), así nunca se agregan cajones donde no caben.

  const drawersReason = !series.supportsDrawers
    ? t('drawersNotForSeries')
    : size.width < 300
      ? t('drawersTooNarrow')
      : t('drawersTooShort');

  // Nunca lanza: con datos a medio escribir devuelve null y no se muestra vista previa
  const build = useMemo(
    () => tryBuildCabinet(seriesId, size, { drawers: drawers && canHaveDrawers }),
    [seriesId, size.width, size.height, size.depth, drawers, canHaveDrawers] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const sizeLabel = isStandardSize(seriesId, size) ? `${size.width}` : `${size.width} × ${size.height} × ${size.depth}`;
  const groupName = `${t(SERIES_NAME_KEYS[seriesId])} ${sizeLabel}${build?.drawers ? ` ${t('withDrawersSuffix')}` : ''}`;

  const chooseSeries = (id: CabinetSeriesId) => {
    // En modo personalizado, si la profundidad era la de la serie anterior, pasa a la de la nueva
    if (mode === 'custom' && Number(custom.depth) === series.depth) {
      const next = CABINET_SERIES.find((s) => s.id === id)!;
      setCustom((c) => ({ ...c, depth: String(next.depth) }));
    }
    setSeriesId(id);
  };

  const chooseCustom = () => {
    const base = standardSize(seriesId, width);
    setCustom({ width: String(base.width), height: String(base.height), depth: String(base.depth) });
    setMode('custom');
  };

  const handleAdd = () => {
    if (!build) return;
    onAdd(
      createCabinetGroups({
        seriesId,
        size,
        drawers: build.drawers,
        quantity,
        groupName,
        partName: (key) => t(PART_NAME_KEYS[key]),
      })
    );
  };

  const chipClass = (active: boolean) =>
    `text-xs font-semibold px-2 py-1.5 rounded-lg border transition-colors ${FOCUS} ${
      active
        ? 'bg-orange-500 border-orange-500 text-white'
        : darkMode
          ? 'border-gray-700 text-gray-200 hover:border-orange-500'
          : 'border-gray-200 text-gray-700 hover:border-orange-500'
    }`;

  const inputClass = (invalid: boolean) =>
    `w-full px-2 py-1.5 rounded-lg border text-sm font-semibold ${FOCUS} ${
      invalid
        ? 'border-red-500'
        : darkMode
          ? 'border-gray-700'
          : 'border-gray-200'
    } ${darkMode ? 'bg-gray-900/60 text-gray-100' : 'bg-white text-gray-900'}`;

  return (
    <div
      className={`rounded-2xl shadow-sm border p-5 transition-colors duration-200 ${
        darkMode ? 'bg-gray-800/80 border-gray-700/80 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
      }`}
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <Box className="w-4 h-4 text-orange-500" aria-hidden="true" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('addCabinet')}</h2>
      </div>

      {/* Serie */}
      <div className="mb-3" role="group" aria-label={t('series')}>
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">{t('series')}</span>
        <div className="grid grid-cols-2 gap-1.5">
          {CABINET_SERIES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === seriesId}
              onClick={() => chooseSeries(s.id)}
              className={chipClass(s.id === seriesId)}
            >
              {t(SERIES_NAME_KEYS[s.id])}
            </button>
          ))}
        </div>
      </div>

      {/* Ancho estándar o medida personalizada */}
      <div className="mb-3" role="group" aria-label={t('widthMm')}>
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">{t('widthMm')}</span>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {STANDARD_WIDTHS.map((w) => {
            const active = mode === 'standard' && w === width;
            return (
              <button
                key={w}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setWidth(w);
                  setMode('standard');
                }}
                className={chipClass(active)}
              >
                {w}
              </button>
            );
          })}
          <button type="button" aria-pressed={mode === 'custom'} onClick={chooseCustom} className={chipClass(mode === 'custom')}>
            {t('custom')}
          </button>
        </div>
      </div>

      {mode === 'custom' && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['width', 'height', 'depth'] as const).map((field) => {
            const problem = problemFor(field);
            const errorId = `custom-${field}-error`;
            return (
              <label key={field} className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {t(FIELD_LABEL_KEYS[field])} (mm)
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={custom[field]}
                  onChange={(e) => setCustom((c) => ({ ...c, [field]: e.target.value }))}
                  aria-invalid={!!problem}
                  aria-describedby={problem ? errorId : undefined}
                  className={`mt-1 ${inputClass(!!problem)}`}
                />
                {problem && (
                  <span id={errorId} className="block mt-1 text-[11px] text-red-600 dark:text-red-400">
                    {t(FIELD_LABEL_KEYS[field])} {t('sizeRange').replace('{min}', String(problem.min)).replace('{max}', String(problem.max))}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* Cajones y cantidad */}
      <div className="flex flex-wrap items-end gap-4 mb-3">
        <label className={`flex items-center gap-2 text-xs font-medium ${canHaveDrawers ? '' : 'opacity-60'}`}>
          <input
            type="checkbox"
            checked={!!build?.drawers}
            disabled={!canHaveDrawers}
            onChange={(e) => setDrawers(e.target.checked)}
            className={`w-4 h-4 accent-orange-500 ${FOCUS}`}
          />
          <span>{t('drawers')}</span>
          {!canHaveDrawers && problems.length === 0 && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">({drawersReason})</span>
          )}
        </label>

        <label className="flex items-center gap-2 text-xs font-medium">
          <span>{t('qty')}</span>
          <input
            type="number"
            min={1}
            max={MAX_CABINET_QUANTITY}
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            onBlur={() => setQuantityInput(String(quantity))}
            className={`w-16 px-2 py-1 rounded-lg border text-xs ${FOCUS} ${
              darkMode ? 'bg-gray-900/60 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
            }`}
          />
        </label>
      </div>

      {/* Vista previa de piezas */}
      {build && (
        <ul className="text-xs space-y-1 mb-3 font-mono" aria-label={groupName}>
          {build.parts.map((p) => (
            <li key={p.key} className="flex justify-between gap-2">
              <span className="font-sans">
                {t(PART_NAME_KEYS[p.key])}
                {/* Piezas que no salen del tablero de estructura: se indica de cuál */}
                {p.material !== 'carcass' && (
                  <span
                    className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      p.material === 'agt'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                        : 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200'
                    }`}
                  >
                    {MATERIAL_NAMES[p.material]}
                  </span>
                )}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {fmtMm(p.width)} × {fmtMm(p.height)} · ×{p.quantity}
              </span>
            </li>
          ))}
          {build.extraBoards > 0 && (
            <li className="font-sans font-semibold text-orange-600 dark:text-orange-400">{t('extraDrawerBoard')}</li>
          )}
        </ul>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={!build}
        className={`w-full flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS}`}
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span>
          {t('addCabinet')}: {groupName}
          {quantity > 1 ? ` ×${quantity}` : ''}
        </span>
      </button>
    </div>
  );
};
