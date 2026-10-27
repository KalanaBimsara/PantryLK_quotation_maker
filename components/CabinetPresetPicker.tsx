import React, { useEffect, useMemo, useState } from 'react';
import { Box, Plus } from 'lucide-react';
import { Piece } from '../types';
import {
  CABINET_SERIES,
  STANDARD_WIDTHS,
  buildCabinet,
  drawersAvailable,
  standardSize,
  CabinetPartKey,
  CabinetSeriesId,
} from '../services/cabinetSeries';
import { createCabinetGroups, clampCabinetQuantity, MAX_CABINET_QUANTITY } from '../services/cabinetPieces';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../contexts/translations';

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

interface CabinetPresetPickerProps {
  darkMode: boolean;
  onAdd: (pieces: Piece[]) => void;
}

export const CabinetPresetPicker: React.FC<CabinetPresetPickerProps> = ({ darkMode, onAdd }) => {
  const { t } = useLanguage();
  const [seriesId, setSeriesId] = useState<CabinetSeriesId>('deep-560');
  const [width, setWidth] = useState<number>(600);
  const [drawers, setDrawers] = useState<boolean>(false);
  // Texto crudo para poder borrar y reescribir el número; se limita al usarlo
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const quantity = clampCabinetQuantity(Number(quantityInput));

  const size = standardSize(seriesId, width);
  const canHaveDrawers = drawersAvailable(seriesId, size);
  const series = CABINET_SERIES.find((s) => s.id === seriesId);

  // Si la combinación actual no admite cajones, se desmarca la opción
  useEffect(() => {
    if (!canHaveDrawers) setDrawers(false);
  }, [canHaveDrawers]);

  const build = useMemo(
    () => buildCabinet(seriesId, standardSize(seriesId, width), { drawers: drawers && canHaveDrawers }),
    [seriesId, width, drawers, canHaveDrawers]
  );

  const groupName = `${t(SERIES_NAME_KEYS[seriesId])} ${width}${build.drawers ? ` ${t('withDrawersSuffix')}` : ''}`;

  const handleAdd = () => {
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
    `text-xs font-semibold px-2 py-1.5 rounded-lg border transition-colors ${
      active
        ? 'bg-orange-500 border-orange-500 text-white'
        : darkMode
          ? 'border-gray-700 text-gray-200 hover:border-orange-500'
          : 'border-gray-200 text-gray-700 hover:border-orange-500'
    }`;

  return (
    <div className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Box className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-bold">{t('cabinetPresets')}</h3>
      </div>

      {/* Serie */}
      <div className="mb-3">
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">{t('series')}</span>
        <div className="grid grid-cols-2 gap-1.5">
          {CABINET_SERIES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === seriesId}
              onClick={() => setSeriesId(s.id)}
              className={chipClass(s.id === seriesId)}
            >
              {t(SERIES_NAME_KEYS[s.id])}
            </button>
          ))}
        </div>
      </div>

      {/* Ancho estándar */}
      <div className="mb-3">
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">{t('widthMm')}</span>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {STANDARD_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={w === width}
              onClick={() => setWidth(w)}
              className={chipClass(w === width)}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Cajones y cantidad */}
      <div className="flex flex-wrap items-end gap-4 mb-3">
        <label className={`flex items-center gap-2 text-xs font-medium ${canHaveDrawers ? '' : 'opacity-60'}`}>
          <input
            type="checkbox"
            checked={build.drawers}
            disabled={!canHaveDrawers}
            onChange={(e) => setDrawers(e.target.checked)}
            className="w-4 h-4 accent-orange-500"
          />
          <span>{t('drawers')}</span>
          {!canHaveDrawers && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              ({series?.supportsDrawers ? t('drawersTooNarrow') : t('drawersNotForSeries')})
            </span>
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
            className={`w-16 px-2 py-1 rounded-lg border text-xs ${
              darkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
            }`}
          />
        </label>
      </div>

      {/* Vista previa de piezas */}
      <ul className="text-xs space-y-1 mb-3 font-mono">
        {build.parts.map((p) => (
          <li key={p.key} className="flex justify-between gap-2">
            <span className="font-sans">{t(PART_NAME_KEYS[p.key])}</span>
            <span className="text-gray-500 dark:text-gray-400">
              {p.width} × {p.height} · ×{p.quantity}
            </span>
          </li>
        ))}
        {build.extraBoards > 0 && (
          <li className="font-sans font-semibold text-orange-600 dark:text-orange-400">{t('extraDrawerBoard')}</li>
        )}
      </ul>

      <button
        type="button"
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors active:scale-[0.99]"
      >
        <Plus className="w-4 h-4" />
        <span>
          {t('addCabinet')}: {groupName}
          {quantity > 1 ? ` ×${quantity}` : ''}
        </span>
      </button>
    </div>
  );
};
