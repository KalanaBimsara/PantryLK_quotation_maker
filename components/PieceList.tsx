import React, { useRef, useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Upload,
  Download,
  RotateCw,
  Lock,
  Save,
  FolderOpen,
  X,
  ChevronDown,
  ChevronRight,
  Box,
  MoreHorizontal,
  Eraser,
  PackagePlus,
} from 'lucide-react';
import { Piece, Template } from '../types';
import { parsePiecesCSV, exportPiecesListCSV } from '../services/csvHelper';
import { loadStoredTemplates, saveStoredTemplates } from '../services/storage';
import { useLanguage } from '../contexts/LanguageContext';
import { templatePiecesFrom, piecesFromTemplate } from '../services/templatePieces';
import { groupPieces } from '../services/cutList';

interface PieceListProps {
  pieces: Piece[];
  onChange: (pieces: Piece[]) => void;
  darkMode: boolean;
  hoveredPieceId: string | null;
  onHoverPiece: (id: string | null) => void;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500';

export const PieceList: React.FC<PieceListProps> = ({
  pieces,
  onChange,
  darkMode,
  hoveredPieceId,
  onHoverPiece,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTemplates(loadStoredTemplates());
  }, []);

  // El menú ⋯ se cierra con Esc o al hacer clic fuera
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const updateField = (id: string, field: keyof Piece, value: any) => {
    onChange(
      pieces.map((p) => {
        if (p.id !== id) return p;
        return { ...p, [field]: value };
      })
    );
  };

  const addPiece = () => {
    const newId = `piece-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    onChange([
      ...pieces,
      {
        id: newId,
        name: `${t('piece')} #${pieces.length + 1}`,
        width: 400,
        height: 600,
        quantity: 1,
        canRotate: true,
      },
    ]);
  };

  const duplicatePiece = (id: string) => {
    const item = pieces.find((p) => p.id === id);
    if (!item) return;
    const newId = `piece-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    onChange([
      ...pieces,
      {
        ...item,
        id: newId,
        name: `${item.name || t('piece')} (${t('copySuffix')})`,
      },
    ]);
  };

  const removePiece = (id: string) => {
    onChange(pieces.filter((p) => p.id !== id));
  };

  const removeGroup = (groupId: string) => {
    if (window.confirm(t('deleteGroupConfirm'))) {
      onChange(pieces.filter((p) => p.groupId !== groupId));
    }
  };

  const clearAll = () => {
    if (window.confirm(t('clearAllConfirm'))) {
      onChange([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parsePiecesCSV(content);
        if (parsed.length > 0) {
          onChange(parsed);
        } else {
          alert(t('csvNoPieces'));
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveTemplate = () => {
    if (pieces.length === 0) return;
    const name = window.prompt(t('enterTemplateName'));
    if (!name) return;

    // Sin ids; los grupos se guardan como claves locales para recuperar cada gabinete al cargar
    const templatePieces = templatePiecesFrom(pieces);

    const existingIndex = templates.findIndex((tpl) => tpl.name.toLowerCase() === name.toLowerCase());
    const newTemplates = [...templates];

    if (existingIndex >= 0) {
      if (!window.confirm(t('templateOverwriteConfirm'))) return;
      newTemplates[existingIndex] = { ...newTemplates[existingIndex], pieces: templatePieces };
    } else {
      newTemplates.push({ id: `tpl-${Date.now()}`, name, pieces: templatePieces });
    }

    setTemplates(newTemplates);
    saveStoredTemplates(newTemplates);
    alert(t('templateSaved'));
  };

  const loadTemplate = (template: Template) => {
    onChange([...pieces, ...piecesFromTemplate(template)]);
    setShowTemplateModal(false);
  };

  const deleteTemplate = (id: string) => {
    if (window.confirm(t('deleteTemplateConfirm'))) {
      const newTemplates = templates.filter((tpl) => tpl.id !== id);
      setTemplates(newTemplates);
      saveStoredTemplates(newTemplates);
    }
  };

  const translateDefaultName = (name: string) => {
    const map: Record<string, string> = {
      'Left side': t('leftSide'),
      'Main door': t('mainDoor'),
      'Top cover': t('topCover'),
      'Inner shelves': t('innerShelves'),
      'Drawer front': t('drawerFront'),
    };
    return map[name] || name;
  };

  // Acción del menú ⋯: ejecuta y cierra
  const menuAction = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  const { groups, loose } = groupPieces(pieces);

  const inputBase = `rounded bg-transparent border border-gray-200 dark:border-gray-600 focus:border-orange-500 ${FOCUS}`;

  const renderRow = (p: Piece, idx: number) => {
    const isHovered = hoveredPieceId === p.id;
    const label = translateDefaultName(p.name || '') || `${t('piece')} #${idx + 1}`;
    return (
      <div
        key={p.id}
        onMouseEnter={() => onHoverPiece(p.id)}
        onMouseLeave={() => onHoverPiece(null)}
        className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl transition-all border ${
          isHovered
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 ring-1 ring-blue-500'
            : darkMode
              ? 'bg-gray-750/70 border-gray-700/60 hover:bg-gray-700/80'
              : 'bg-gray-50/80 border-gray-200/80 hover:bg-gray-100/90'
        }`}
      >
        <div className="col-span-4">
          <input
            aria-label={`${t('name')} – ${label}`}
            type="text"
            value={translateDefaultName(p.name || '')}
            placeholder={`${t('piece')} #${idx + 1}`}
            onChange={(e) => updateField(p.id, 'name', e.target.value)}
            className={`w-full text-xs font-medium px-2 py-1 rounded bg-transparent border-0 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-orange-500 ${FOCUS}`}
          />
        </div>
        <div className="col-span-2">
          <input
            aria-label={`${t('width')} (mm) – ${label}`}
            type="number"
            min="1"
            value={p.width || ''}
            onChange={(e) => updateField(p.id, 'width', Math.max(0, Number(e.target.value)))}
            className={`w-full text-xs font-bold text-center px-1 py-1 ${inputBase}`}
            placeholder="W"
          />
        </div>
        <div className="col-span-2">
          <input
            aria-label={`${t('height')} (mm) – ${label}`}
            type="number"
            min="1"
            value={p.height || ''}
            onChange={(e) => updateField(p.id, 'height', Math.max(0, Number(e.target.value)))}
            className={`w-full text-xs font-bold text-center px-1 py-1 ${inputBase}`}
            placeholder="H"
          />
        </div>
        <div className="col-span-1">
          <input
            aria-label={`${t('qty')} – ${label}`}
            type="number"
            min="1"
            max="999"
            value={p.quantity || ''}
            onChange={(e) => updateField(p.id, 'quantity', Math.max(1, Number(e.target.value)))}
            className={`w-full text-xs font-bold text-center px-0.5 py-1 ${inputBase}`}
          />
        </div>
        <div className="col-span-1 flex justify-center">
          <button
            type="button"
            onClick={() => updateField(p.id, 'canRotate', !p.canRotate)}
            aria-pressed={!p.canRotate}
            aria-label={`${p.canRotate ? t('canRotateHint') : t('grainLocked')} – ${label}`}
            title={p.canRotate ? t('canRotateHint') : t('grainLocked')}
            className={`p-1.5 rounded-lg text-xs transition-all ${FOCUS} ${
              p.canRotate
                ? 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'text-amber-600 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-300 ring-1 ring-amber-400/50'
            }`}
          >
            {p.canRotate ? <RotateCw className="w-3.5 h-3.5" aria-hidden="true" /> : <Lock className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
        </div>
        <div className="col-span-2 flex justify-end items-center gap-1">
          <button
            type="button"
            onClick={() => duplicatePiece(p.id)}
            aria-label={`${t('duplicatePart')} – ${label}`}
            title={t('duplicatePart')}
            className={`p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors ${FOCUS}`}
          >
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => removePiece(p.id)}
            aria-label={`${t('deletePart')} – ${label}`}
            title={t('deletePart')}
            className={`p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors ${FOCUS}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  };

  const menuItemClass = `w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${FOCUS} ${
    darkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
  }`;

  return (
    <>
      <div
        className={`rounded-2xl shadow-sm border p-5 flex flex-col transition-colors duration-200 ${
          darkMode ? 'bg-gray-800/80 border-gray-700/80 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
        }`}
      >
        {/* Encabezado con menú de acciones */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-700 gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('piecesList')} ({pieces.length})
          </h2>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.txt"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t('moreActions')}
              title={t('moreActions')}
              className={`p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 ${FOCUS}`}
            >
              <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className={`absolute right-0 mt-1 w-52 z-30 p-1 rounded-xl border shadow-lg ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <button role="menuitem" type="button" className={menuItemClass} onClick={menuAction(saveTemplate)} disabled={pieces.length === 0}>
                  <Save className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" /> {t('saveTemplate')}
                </button>
                <button role="menuitem" type="button" className={menuItemClass} onClick={menuAction(() => setShowTemplateModal(true))}>
                  <FolderOpen className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" /> {t('loadTemplate')}
                </button>
                <button role="menuitem" type="button" className={menuItemClass} onClick={menuAction(() => fileInputRef.current?.click())}>
                  <Upload className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" /> {t('importCsv')}
                </button>
                <button role="menuitem" type="button" className={menuItemClass} onClick={menuAction(() => exportPiecesListCSV(pieces))} disabled={pieces.length === 0}>
                  <Download className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" /> {t('exportPartsCsv')}
                </button>
                <button role="menuitem" type="button" className={`${menuItemClass} text-red-600 dark:text-red-400`} onClick={menuAction(clearAll)} disabled={pieces.length === 0}>
                  <Eraser className="w-3.5 h-3.5" aria-hidden="true" /> {t('clearAll')}
                </button>
              </div>
            )}
          </div>
        </div>

        {pieces.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
            <PackagePlus className="w-8 h-8 mx-auto text-orange-500 mb-2 opacity-70" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('addFirstCabinet')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('addFirstCabinetHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[440px]">
              {/* Cabecera de la tabla */}
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 py-1.5 mb-1">
                <div className="col-span-4">{t('name')}</div>
                <div className="col-span-2 text-center">{t('width')}</div>
                <div className="col-span-2 text-center">{t('height')}</div>
                <div className="col-span-1 text-center">{t('qty')}</div>
                <div className="col-span-1 text-center">{t('rotate')}</div>
                <div className="col-span-2 text-right pr-2">{t('actions')}</div>
              </div>

              <div className="overflow-y-auto max-h-[60vh] space-y-1.5 pr-1 custom-scrollbar">
                {/* Un grupo plegable por gabinete (o plantilla) */}
                {groups.map((group) => {
                  const isCollapsed = !!collapsedGroups[group.groupId];
                  return (
                    <div key={group.groupId} className="mt-2 first:mt-0">
                      <div
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                          darkMode ? 'bg-indigo-900/20 border border-indigo-800/30' : 'bg-indigo-50 border border-indigo-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setCollapsedGroups((prev) => ({ ...prev, [group.groupId]: !prev[group.groupId] }))}
                          aria-expanded={!isCollapsed}
                          className={`flex items-center gap-2 flex-1 text-left rounded ${FOCUS}`}
                        >
                          <span className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                            {isCollapsed ? <ChevronRight className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                          </span>
                          {group.isCabinet && <Box className="w-4 h-4 text-indigo-500" aria-hidden="true" />}
                          <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">{group.name}</span>
                          <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                            {group.pieces.length} {t('pieces')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGroup(group.groupId)}
                          aria-label={`${t('deleteGroup')} – ${group.name}`}
                          title={t('deleteGroup')}
                          className={`p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors ${FOCUS}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                      {!isCollapsed && (
                        <div className="pl-4 pr-1 mt-1.5 space-y-1.5 border-l-2 border-indigo-100 dark:border-indigo-900/50 ml-3">
                          {group.pieces.map(renderRow)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Piezas sueltas */}
                {loose.length > 0 && (
                  <div className="mt-3 first:mt-0">
                    {groups.length > 0 && (
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1 mb-1.5">
                        {t('looseParts')} ({loose.length})
                      </h3>
                    )}
                    <div className="space-y-1.5">{loose.map(renderRow)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={addPiece}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors ${FOCUS}`}
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> {t('addPiece')}
          </button>
        </div>
      </div>

      {/* Ventana de plantillas guardadas */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="templates-title"
            className={`relative w-full max-w-lg rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}
          >
            <button
              type="button"
              onClick={() => setShowTemplateModal(false)}
              aria-label={t('close')}
              className={`absolute top-4 right-4 p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${FOCUS}`}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                <FolderOpen className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 id="templates-title" className="text-xl font-bold">
                {t('myTemplates')}
              </h2>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">{t('noTemplates')}</p>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => loadTemplate(tpl)}
                      className={`flex flex-col text-left flex-1 rounded ${FOCUS}`}
                    >
                      <span className="font-semibold text-sm">{tpl.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {tpl.pieces.length} {t('pieces')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(tpl.id)}
                      aria-label={`${t('deleteTemplate')} – ${tpl.name}`}
                      title={t('deleteTemplate')}
                      className={`p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors ${FOCUS}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
