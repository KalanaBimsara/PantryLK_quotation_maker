import React from 'react';
import { Sun, Moon, Globe, PackageSearch, Calculator } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../contexts/translations';
import { ViewState } from '../App';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  darkMode, 
  onToggleDarkMode,
  currentView,
  onViewChange
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header
      className={`sticky top-0 z-50 px-4 sm:px-8 py-3.5 border-b backdrop-blur-md transition-colors duration-200 no-print ${darkMode ? 'bg-gray-900/90 border-gray-800 text-gray-100' : 'bg-white/90 border-gray-200 text-gray-800'
        }`}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt="Pantry LK CutWIZ Logo"
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain select-none shrink-0"
          />
          <div className="hidden sm:block">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Pantry LK CutWIZ
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {t('cutOptimizer')}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-1 mx-2 sm:mx-4 border border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={() => onViewChange('optimizer')}
            aria-label={t('optimizer')}
            aria-current={currentView === 'optimizer' ? 'page' : undefined}
            className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              currentView === 'optimizer'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Calculator className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('optimizer')}</span>
          </button>
          <button
            onClick={() => onViewChange('inventory')}
            aria-label={t('inventory')}
            aria-current={currentView === 'inventory' ? 'page' : undefined}
            className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              currentView === 'inventory'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <PackageSearch className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('inventory')}</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1">
            <Globe className="w-4 h-4 text-gray-500" />
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as Language)}
              aria-label="Language"
              className="bg-transparent outline-none cursor-pointer text-gray-700 dark:text-gray-300 rounded focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="si">සිංහල</option>
            </select>
          </div>
          
          <button
            onClick={onToggleDarkMode}
            aria-label={t('toggleTheme')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {darkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">{t('lightMode')}</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">{t('darkMode')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
