import React, { useState, useEffect } from 'react';
import { PackageSearch, Plus, Trash2, Edit2, Archive, Package, Wrench, CircleEllipsis } from 'lucide-react';
import { InventoryItem, InventoryCategory } from '../types';
import { loadStoredInventory, saveStoredInventory } from '../services/storage';
import { useLanguage } from '../contexts/LanguageContext';

interface InventoryViewProps {
  darkMode: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ darkMode }) => {
  const { t } = useLanguage();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadStoredInventory());
  }, []);

  const handleSave = (newItems: InventoryItem[]) => {
    setItems(newItems);
    saveStoredInventory(newItems);
  };

  const addItem = () => {
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: 'New Item',
      category: 'board',
      quantity: 0,
    };
    handleSave([...items, newItem]);
    setEditingId(newItem.id);
  };

  const updateItem = (id: string, field: keyof InventoryItem, value: any) => {
    const updated = items.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    });
    handleSave(updated);
  };

  const removeItem = (id: string) => {
    if (window.confirm(t('deleteItemConfirm'))) {
      handleSave(items.filter(item => item.id !== id));
    }
  };

  const getCategoryIcon = (category: InventoryCategory) => {
    switch (category) {
      case 'board': return <Archive className="w-4 h-4 text-amber-600" />;
      case 'hardware': return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'accessory': return <Package className="w-4 h-4 text-green-500" />;
      default: return <CircleEllipsis className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category: InventoryCategory) => {
    switch (category) {
      case 'board': return t('categoryBoard');
      case 'hardware': return t('categoryHardware');
      case 'accessory': return t('categoryAccessory');
      default: return t('categoryOther');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className={`rounded-2xl shadow-sm border p-6 transition-colors duration-200 ${
        darkMode ? 'bg-gray-800/80 border-gray-700/80 text-gray-100' : 'bg-white border-gray-200 text-gray-800'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <PackageSearch className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {t('inventory')}
            </h2>
          </div>
          <button
            onClick={addItem}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('addItem')}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <PackageSearch className="w-12 h-12 mx-auto text-gray-400 mb-3 opacity-50" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('noResultsYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-lg">{t('name')}</th>
                  <th className="px-4 py-3 font-semibold">{t('category')}</th>
                  <th className="px-4 py-3 font-semibold">{t('description')}</th>
                  <th className="px-4 py-3 font-semibold text-center">{t('qty')}</th>
                  <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/30 transition-colors">
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-gray-800 dark:text-gray-200">{item.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(item.id, 'category', e.target.value as InventoryCategory)}
                          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="board">{t('categoryBoard')}</option>
                          <option value="hardware">{t('categoryHardware')}</option>
                          <option value="accessory">{t('categoryAccessory')}</option>
                          <option value="other">{t('categoryOther')}</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(item.category)}
                          <span className="text-gray-600 dark:text-gray-400">{getCategoryLabel(item.category)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder={t('description')}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-500 truncate max-w-[200px] block" title={item.description}>
                          {item.description || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          value={item.quantity}
                          min="0"
                          onChange={(e) => updateItem(item.id, 'quantity', Math.max(0, Number(e.target.value)))}
                          className="w-20 mx-auto text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                        />
                      ) : (
                        <span className={`font-bold inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs ${
                          item.quantity > 0 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {item.quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            editingId === item.id 
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400'
                              : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                          }`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
