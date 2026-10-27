import React from 'react';
import { Sliders, Layers } from 'lucide-react';
import { Settings, BoardPreset } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (newSettings: Settings) => void;
  darkMode: boolean;
  autoFrontAreaSqFt?: number;
}

export const BOARD_PRESETS: BoardPreset[] = [
  { id: 'melamina-std-1', name: 'Melamine', width: 2438.4, height: 1219.2, description: '2438.4 × 1219.2 mm (8×4 ft)' },
  { id: 'hmr-18mm', name: 'HDHMR 18mm', width: 2438.4, height: 1219.2, description: '2438.4 × 1219.2 mm' }
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, darkMode, autoFrontAreaSqFt }) => {
  const { t } = useLanguage();

  const handleInputChange = (field: keyof Settings, value: number) => {
    onChange({
      ...settings,
      [field]: Math.max(0, value),
    });
  };

  const handleApplyPreset = (preset: BoardPreset) => {
    onChange({
      ...settings,
      boardWidth: preset.width,
      boardHeight: preset.height,
    });
  };

  return (
    <div
      className={`transition-colors duration-200 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('boardConfig')}
          </h2>
        </div>
      </div>

      {/* Selector de Presets de Placas */}
      <div className="mb-4">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          {t('boardPresets')}:
        </span>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {BOARD_PRESETS.map((preset) => {
            const isSelected = settings.boardWidth === preset.width && settings.boardHeight === preset.height;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`px-2.5 py-1.5 text-left rounded-lg text-xs font-medium transition-all border ${isSelected
                  ? 'border-blue-500 bg-blue-50/80 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-400 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50/50 dark:bg-gray-750 text-gray-600 dark:text-gray-300'
                  }`}
              >
                <div className="font-semibold truncate">{preset.name}</div>
                <div className="text-[10px] opacity-75">{preset.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs de Medidas */}
      <div className="space-y-3">
        {/* El nombre del trabajo se edita en la barra del trabajo (JobBar) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="board-width" className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">
              {t('widthMm')}
            </label>
            <input
              id="board-width"
              name="boardWidth"
              type="number"
              min="100"
              step="0.1"
              value={settings.boardWidth || ''}
              onChange={(e) => handleInputChange('boardWidth', Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-gray-700/60 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
            />
          </div>
          <div>
            <label htmlFor="board-height" className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">
              {t('heightMm')}
            </label>
            <input
              id="board-height"
              name="boardHeight"
              type="number"
              min="100"
              step="0.1"
              value={settings.boardHeight || ''}
              onChange={(e) => handleInputChange('boardHeight', Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-gray-700/60 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="board-kerf" className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">
              {t('bladeThickness')}
            </label>
            <input
              id="board-kerf"
              name="kerf"
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={settings.kerf}
              onChange={(e) => handleInputChange('kerf', Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-gray-700/60 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">{t('bladeHint')}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="board-trim-margin" className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {t('trimMarginMm')}
              </label>
              <input
                type="checkbox"
                id="enable-trim-margin"
                name="enableTrimMargin"
                aria-label={t('enable')}
                title={t('enable')}
                checked={!!settings.enableTrimMargin}
                onChange={(e) => onChange({ ...settings, enableTrimMargin: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
            </div>
            <input
              id="board-trim-margin"
              name="trimMargin"
              type="number"
              min="0"
              max="100"
              step="1"
              disabled={!settings.enableTrimMargin}
              value={settings.trimMargin}
              onChange={(e) => handleInputChange('trimMargin', Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold outline-none transition-all ${!settings.enableTrimMargin
                ? 'opacity-40 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed text-gray-400 dark:text-gray-500'
                : darkMode
                  ? 'bg-gray-700/60 border-gray-600 text-white focus:ring-2 focus:ring-blue-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                }`}
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              {settings.enableTrimMargin ? t('trimHint') : t('off')}
            </span>
          </div>
        </div>

        {/* Cost Estimation */}
        <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Job Costing (Rs.)</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="board-price" className="text-[10px] font-medium text-gray-600 dark:text-gray-300 block mb-1">
                Board Price (Rs.)
              </label>
              <input
                id="board-price"
                type="number"
                min="0"
                step="100"
                value={settings.boardPrice || ''}
                onChange={(e) => handleInputChange('boardPrice', Number(e.target.value))}
                placeholder="0.00"
                className={`w-full px-2 py-1.5 rounded border text-xs font-semibold outline-none focus:ring-2 focus:ring-green-500 transition-all ${darkMode ? 'bg-gray-700/60 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label htmlFor="edge-band-price" className="text-[10px] font-medium text-gray-600 dark:text-gray-300 block mb-1">
                Edge Band (Rs/m)
              </label>
              <input
                id="edge-band-price"
                type="number"
                min="0"
                step="10"
                value={settings.edgeBandPricePerM === undefined ? 60 : settings.edgeBandPricePerM}
                onChange={(e) => handleInputChange('edgeBandPricePerM', Number(e.target.value))}
                placeholder="60.00"
                className={`w-full px-2 py-1.5 rounded border text-xs font-semibold outline-none focus:ring-2 focus:ring-green-500 transition-all ${darkMode ? 'bg-gray-700/60 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label htmlFor="machine-rent" className="text-[10px] font-medium text-gray-600 dark:text-gray-300 block mb-1">
                Machine Rent (Rs/sq ft)
              </label>
              <input
                id="machine-rent"
                type="number"
                min="0"
                step="50"
                value={settings.machineRentPerSqFt === undefined ? 500 : settings.machineRentPerSqFt}
                onChange={(e) => handleInputChange('machineRentPerSqFt', Number(e.target.value))}
                placeholder="500.00"
                className={`w-full px-2 py-1.5 rounded border text-xs font-semibold outline-none focus:ring-2 focus:ring-green-500 transition-all ${darkMode ? 'bg-gray-700/60 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label htmlFor="labor-sqm" className="text-[10px] font-medium text-gray-600 dark:text-gray-300 block mb-1">
                Labour (Rs/sq ft)
              </label>
              <input
                id="labor-sqm"
                type="number"
                min="0"
                step="50"
                value={settings.laborPerSqFt === undefined ? 850 : settings.laborPerSqFt}
                onChange={(e) => handleInputChange('laborPerSqFt', Number(e.target.value))}
                placeholder="850.00"
                className={`w-full px-2 py-1.5 rounded border text-xs font-semibold outline-none focus:ring-2 focus:ring-green-500 transition-all ${darkMode ? 'bg-gray-700/60 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="front-area" className="text-[10px] font-medium text-gray-600 dark:text-gray-300 flex justify-between items-center mb-1">
                <span>Total Cupboard Front Area (sq ft)</span>
                {autoFrontAreaSqFt !== undefined && autoFrontAreaSqFt > 0 && (
                  <span className="text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                    Auto: {autoFrontAreaSqFt} sq ft
                  </span>
                )}
              </label>
              <input
                id="front-area"
                type="number"
                min="0"
                step="0.1"
                value={settings.frontAreaSqFt !== undefined ? settings.frontAreaSqFt : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    const newSettings = { ...settings };
                    delete newSettings.frontAreaSqFt;
                    onChange(newSettings);
                  } else {
                    handleInputChange('frontAreaSqFt', Number(val));
                  }
                }}
                placeholder={autoFrontAreaSqFt ? `Auto (${autoFrontAreaSqFt} sq ft)` : "e.g. 25.5"}
                className={`w-full px-2 py-1.5 rounded border text-xs font-semibold outline-none focus:ring-2 focus:ring-green-500 transition-all ${darkMode ? 'bg-gray-700/60 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
              <span className="text-[9px] text-gray-400 mt-0.5 block">
                Leave empty to auto-calculate based on loaded templates.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
