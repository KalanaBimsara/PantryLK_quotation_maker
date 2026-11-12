import React from 'react';
import { Settings2, FileText, Download } from 'lucide-react';
import { Settings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { sheetText } from '../services/materials';

interface JobBarProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onOpenSettings: () => void;
  onPrint: () => void;
  onExportCsv: () => void;
  canExport: boolean;
  darkMode: boolean;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500';

// Barra del trabajo: nombre, resumen del tablero y acciones principales
export const JobBar: React.FC<JobBarProps> = ({
  settings,
  onSettingsChange,
  onOpenSettings,
  onPrint,
  onExportCsv,
  canExport,
  darkMode,
}) => {
  const { t } = useLanguage();

  const trimText = settings.enableTrimMargin ? `${settings.trimMargin}` : t('off');
  // Tablero de estructura, hoja de AGT, corte y refilado
  const boardChip = `${settings.boardWidth} × ${settings.boardHeight} · AGT ${sheetText(settings.agtWidth, settings.agtHeight)} · ${t('kerf')} ${settings.kerf} · ${t('trim')} ${trimText}`;

  const buttonClass = `flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS} ${
    darkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-750' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
  }`;

  return (
    <div
      className={`print:hidden rounded-2xl border px-4 py-3 flex flex-wrap items-center gap-3 ${
        darkMode ? 'bg-gray-800/80 border-gray-700/80' : 'bg-white border-gray-200'
      }`}
    >
      <label className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{t('jobName')}</span>
        <input
          type="text"
          value={settings.jobNumber ?? ''}
          onChange={(e) => onSettingsChange({ ...settings, jobNumber: e.target.value })}
          placeholder="PO-12345"
          className={`min-w-0 flex-1 max-w-xs px-2.5 py-1.5 rounded-lg border text-sm font-semibold ${FOCUS} ${
            darkMode ? 'bg-gray-900/60 border-gray-700 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-900'
          }`}
        />
      </label>

      <span
        className={`text-xs font-mono px-2.5 py-1.5 rounded-lg ${
          darkMode ? 'bg-gray-900/60 text-gray-300' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {boardChip}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onOpenSettings} className={buttonClass}>
          <Settings2 className="w-4 h-4 text-blue-500" aria-hidden="true" />
          {t('jobSettings')}
        </button>
        <button type="button" onClick={onPrint} disabled={!canExport} className={buttonClass}>
          <FileText className="w-4 h-4 text-red-500" aria-hidden="true" />
          {t('printPdf')}
        </button>
        <button type="button" onClick={onExportCsv} disabled={!canExport} className={buttonClass}>
          <Download className="w-4 h-4 text-emerald-500" aria-hidden="true" />
          {t('exportCsv')}
        </button>
      </div>
    </div>
  );
};
