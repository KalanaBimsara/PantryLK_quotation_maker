import React, { useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Upload, Download, RotateCw, Lock, Sparkles, AlertCircle, Save, FolderOpen, X, ChevronDown, ChevronRight, Box } from 'lucide-react';
import { Piece, Template } from '../types';
import { parsePiecesCSV, exportPiecesListCSV } from '../services/csvHelper';
import { EXAMPLE_PIECES, loadStoredTemplates, saveStoredTemplates } from '../services/storage';
import { useLanguage } from '../contexts/LanguageContext';
import { CabinetPresetPicker } from './CabinetPresetPicker';
import { templatePiecesFrom, piecesFromTemplate } from '../services/templatePieces';

interface PieceListProps {
  pieces: Piece[];
  onChange: (pieces: Piece[]) => void;
  darkMode: boolean;
  hoveredPieceId: string | null;
  onHoverPiece: (id: string | null) => void;
}

export const PieceList: React.FC<PieceListProps> = ({
  pieces,
  onChange,
  darkMode,
  hoveredPieceId,
  onHoverPiece,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTemplates(loadStoredTemplates());
  }, []);

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
        name: `${item.name || t('piece')} (copia)`,
      },
    ]);
  };

  const removePiece = (id: string) => {
    onChange(pieces.filter((p) => p.id !== id));
  };
  
  const removeGroup = (groupId: string) => {
    if (window.confirm('Are you sure you want to delete this entire group?')) {
      onChange(pieces.filter((p) => p.groupId !== groupId));
    }
  };

  const clearAll = () => {
    if (window.confirm(t('clearAllConfirm'))) {
      onChange([]);
    }
  };

  const loadExample = () => {
    onChange(EXAMPLE_PIECES);
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

    const existingIndex = templates.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
    let newTemplates = [...templates];

    if (existingIndex >= 0) {
      if (window.confirm('A template with this name already exists. Overwrite?')) {
        newTemplates[existingIndex] = {
          ...newTemplates[existingIndex],
          pieces: templatePieces
        };
      } else {
        return;
      }
    } else {
      newTemplates.push({
        id: `tpl-${Date.now()}`,
        name,
        pieces: templatePieces,
      });
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
    if (window.confirm('Are you sure you want to delete this template?')) {
      const newTemplates = templates.filter(t => t.id !== id);
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

  // Process pieces into groups
  const groupedPieces: Array<{ isGroup: boolean, id: string, name?: string, items: Piece[] }> = [];
  pieces.forEach(p => {
    if (p.groupId) {
      let group = groupedPieces.find(g => g.isGroup && g.id === p.groupId);
      if (!group) {
        group = { isGroup: true, id: p.groupId, name: p.groupName, items: [] };
        groupedPieces.push(group);
      }
      group.items.push(p);
    } else {
      let ungrouped = groupedPieces.find(g => !g.isGroup && g.id === 'ungrouped');
      if (!ungrouped) {
        ungrouped = { isGroup: false, id: 'ungrouped', name: 'Ungrouped', items: [] };
        groupedPieces.push(ungrouped);
      }
      ungrouped.items.push(p);
    }
  });

  return (
    <>
      <div
        className={`rounded-2xl shadow-sm border p-5 flex flex-col transition-colors duration-200 ${
          darkMode ? 'bg-gray-800/80 border-gray-700/80 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
        }`}
      >
        {/* Header y Acciones de Archivo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-700 gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('piecesList')} ({pieces.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              title={t('loadTemplate')}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300"
            >
              <FolderOpen className="w-3.5 h-3.5 text-orange-500" />
              <span className="hidden sm:inline">{t('templates')}</span>
            </button>

            <button
              type="button"
              onClick={saveTemplate}
              disabled={pieces.length === 0}
              title={t('saveTemplate')}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">{t('saveTemplate')}</span>
            </button>

            <input
              id="csv-upload-input"
              name="csvUploadInput"
              aria-label="Importar archivo CSV de despiece"
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Importar lista desde un archivo CSV"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300"
            >
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => exportPiecesListCSV(pieces)}
              title="Descargar lista actual en CSV"
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Cabecera de la Tabla */}
            <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 py-1.5 mb-1">
              <div className="col-span-4">{t('name')}</div>
              <div className="col-span-2 text-center">{t('width')}</div>
              <div className="col-span-2 text-center">{t('height')}</div>
              <div className="col-span-1 text-center">{t('qty')}</div>
              <div className="col-span-1 text-center">{t('rotate')}</div>
              <div className="col-span-2 text-right pr-2">{t('actions')}</div>
            </div>

            {/* Filas de Piezas con Scroll */}
            <div className="overflow-y-auto max-h-[380px] space-y-1.5 pr-1 custom-scrollbar">
        {pieces.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
            <AlertCircle className="w-8 h-8 mx-auto text-gray-400 mb-2 opacity-60" />
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('noResultsYet')}</p>
            <button
              onClick={loadExample}
              className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" /> {t('loadExamplePieces')}
            </button>
          </div>
        ) : (
          groupedPieces.map((group) => {
            const isCollapsed = collapsedGroups[group.id];

            const toggleCollapse = () => {
              setCollapsedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }));
            };

            return (
              <React.Fragment key={group.id}>
                {/* Group Header */}
                {group.isGroup && (
                  <div className={`flex items-center justify-between p-2 mt-2 rounded-lg ${darkMode ? 'bg-indigo-900/20 border border-indigo-800/30' : 'bg-indigo-50 border border-indigo-100'} transition-colors group`}>
                    <button 
                      type="button"
                      onClick={toggleCollapse}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                      <Box className="w-4 h-4 text-indigo-500" />
                      <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">{group.name}</span>
                      <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                        {group.items.length} {t('pieces')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGroup(group.id)}
                      title="Eliminar grupo / Delete group"
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Items */}
                {(!group.isGroup || !isCollapsed) && (
                  <div className={group.isGroup ? "pl-4 pr-1 space-y-1.5 border-l-2 border-indigo-100 dark:border-indigo-900/50 ml-3" : "space-y-1.5"}>
                    {group.items.map((p, idx) => {
                      const isHovered = hoveredPieceId === p.id;
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
                          {/* Nombre */}
                          <div className="col-span-4">
                            <input
                              id={`piece-name-${p.id}`}
                              name={`piece_name_${p.id}`}
                              aria-label={`Nombre de la pieza #${idx + 1}`}
                              type="text"
                              value={translateDefaultName(p.name || '')}
                              placeholder={`${t('piece')} #${idx + 1}`}
                              onChange={(e) => updateField(p.id, 'name', e.target.value)}
                              className="w-full text-xs font-medium px-2 py-1 rounded bg-transparent border-0 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:bg-white/10 outline-none transition-colors"
                            />
                          </div>

                          {/* Ancho */}
                          <div className="col-span-2">
                            <input
                              id={`piece-width-${p.id}`}
                              name={`piece_width_${p.id}`}
                              aria-label={`Ancho en milímetros de la pieza #${idx + 1}`}
                              type="number"
                              min="1"
                              value={p.width || ''}
                              onChange={(e) => updateField(p.id, 'width', Math.max(0, Number(e.target.value)))}
                              className="w-full text-xs font-bold text-center px-1 py-1 rounded bg-transparent border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                              placeholder="W"
                            />
                          </div>

                          {/* Alto */}
                          <div className="col-span-2">
                            <input
                              id={`piece-height-${p.id}`}
                              name={`piece_height_${p.id}`}
                              aria-label={`Alto en milímetros de la pieza #${idx + 1}`}
                              type="number"
                              min="1"
                              value={p.height || ''}
                              onChange={(e) => updateField(p.id, 'height', Math.max(0, Number(e.target.value)))}
                              className="w-full text-xs font-bold text-center px-1 py-1 rounded bg-transparent border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                              placeholder="H"
                            />
                          </div>

                          {/* Cantidad */}
                          <div className="col-span-1">
                            <input
                              id={`piece-quantity-${p.id}`}
                              name={`piece_quantity_${p.id}`}
                              aria-label={`Cantidad de unidades de la pieza #${idx + 1}`}
                              type="number"
                              min="1"
                              max="999"
                              value={p.quantity || ''}
                              onChange={(e) => updateField(p.id, 'quantity', Math.max(1, Number(e.target.value)))}
                              className="w-full text-xs font-bold text-center px-0.5 py-1 rounded bg-transparent border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          </div>

                          {/* Veta / Control de Rotación */}
                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => updateField(p.id, 'canRotate', !p.canRotate)}
                              className={`p-1.5 rounded-lg text-xs transition-all ${
                                p.canRotate
                                  ? 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  : 'text-amber-600 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-300 ring-1 ring-amber-400/50'
                              }`}
                            >
                              {p.canRotate ? <RotateCw className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Acciones */}
                          <div className="col-span-2 flex justify-end items-center gap-1">
                            <button
                              type="button"
                              onClick={() => duplicatePiece(p.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removePiece(p.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
      </div>
      </div>

      {/* Botonera Inferior */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={addPiece}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t('addPiece')}
        </button>

        {pieces.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            {t('clearAll')}
          </button>
        )}
      </div>
    </div>

    {/* Template Modal */}
    {showTemplateModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className={`relative w-full max-w-lg rounded-2xl shadow-xl p-6 ${
          darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
        }`}>
          <button
            onClick={() => setShowTemplateModal(false)}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">{t('templates')}</h2>
          </div>

          <div className="max-h-[70vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            <CabinetPresetPicker
              darkMode={darkMode}
              onAdd={(newPieces) => {
                onChange([...pieces, ...newPieces]);
                setShowTemplateModal(false);
              }}
            />

            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pt-3">
              {t('myTemplates')}
            </h3>
            {templates.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">{t('noTemplates')}</p>
            ) : (
              templates.map((tpl) => (
                <div 
                  key={tpl.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all cursor-pointer group"
                  onClick={() => loadTemplate(tpl)}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{tpl.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {tpl.pieces.length} {t('pieces')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTemplate(tpl);
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {t('loadTemplate')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(tpl.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
