'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers, Calculator, History, Settings, Search, X, ShoppingBag,
  Receipt, Trash2, Percent, Hammer, FileCheck, RefreshCw, Edit3,
  MessageCircle, Plus, RotateCcw, Printer, Save, CheckCircle,
  AlertTriangle, Sliders, Building2, UserCheck, Check, Edit2,
  PackageSearch, ChevronUp, ChevronDown, ArrowRightLeft, ArrowLeft,
  Box, Grid, Sparkles, Wrench, Lightbulb, Droplets, Flame, LayoutGrid, FileText
} from 'lucide-react';

export default function PantryQuotationApp() {
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState('maker');
  const [toast, setToast] = useState({ show: false, message: '', isSuccess: true });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Data State
  const [allProducts, setAllProducts] = useState([]);
  const [appSettings, setAppSettings] = useState({
    companyName: 'Pantry LK Pvt Ltd',
    companyTagline: 'Premium Modern Kitchen & Pantry Solutions',
    companyAddress: 'Colombo, Sri Lanka',
    companyPhone: '+94 77 000 0000',
    companyEmail: 'sales@pantrylk.com',
    companyWeb: 'www.pantrylk.com',
    labourRatePerSqFt: 1800.0,
    salesCommissionRate: 5.0,
    currency: 'LKR',
    currencySymbol: 'Rs.',
    termsAndConditions: '1. 50% Advance payment upon order confirmation.\n2. 40% Payment prior to dispatch and site delivery.\n3. 10% Balance payment upon final installation & inspection.\n4. Quotation valid for 14 days from issue date.\n5. Warranty applies as per manufacturer terms.'
  });
  const [pastQuotations, setPastQuotations] = useState([]);

  // Catalog Filter & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Active Quotation State
  const [currentQuote, setCurrentQuote] = useState({
    id: '',
    jobNo: '',
    date: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    sqft: 0,
    items: []
  });

  // Modal Visibility
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Admin Catalog Search
  const [adminSearch, setAdminSearch] = useState('');

  // Currency helper
  const formatLKR = (val) => {
    const num = parseFloat(val) || 0;
    return 'Rs. ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Toast trigger
  const showToast = (message, isSuccess = true) => {
    setToast({ show: true, message, isSuccess });
    setTimeout(() => {
      setToast({ show: false, message: '', isSuccess: true });
    }, 2800);
  };

  // Number to Words Converter
  const numberToWords = (amount) => {
    const words = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const num = Math.floor(amount);
    const cents = Math.round((amount - num) * 100);
    if (num === 0) return 'Zero Sri Lankan Rupees';

    function convertGroup(n) {
      let str = '';
      if (n >= 100) {
        str += words[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) str += words[n] + ' ';
      return str;
    }

    let result = '';
    const crore = Math.floor(num / 10000000);
    let rem = num % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    const thousand = Math.floor(rem / 1000);
    rem %= 1000;

    if (crore > 0) result += convertGroup(crore) + 'Crore ';
    if (lakh > 0) result += convertGroup(lakh) + 'Lakh ';
    if (thousand > 0) result += convertGroup(thousand) + 'Thousand ';
    if (rem > 0) result += convertGroup(rem);

    result = result.trim() + ' Sri Lankan Rupees';
    if (cents > 0) {
      result += ` and ${cents}/100 Cents`;
    }
    return result + ' Only';
  };

  // Initial Load
  useEffect(() => {
    loadSettings();
    loadProducts();
    loadQuotations();

    const d = new Date();
    const yr = d.getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    const newJobNo = `PLK-${yr}-${rand}`;
    const newDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const saved = localStorage.getItem('pantrylk_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentQuote({
          id: `quote_${Date.now()}`,
          jobNo: newJobNo,
          date: newDate,
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          sqft: parsed.sqft || 0,
          items: parsed.items || []
        });
        return;
      } catch (e) {}
    }

    setCurrentQuote({
      id: `quote_${Date.now()}`,
      jobNo: newJobNo,
      date: newDate,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      sqft: 0,
      items: []
    });
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setAppSettings(await res.json());
    } catch (e) {}
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const prods = await res.json();
        setAllProducts(prods);
      }
    } catch (e) {}
  };

  const loadQuotations = async () => {
    try {
      const res = await fetch('/api/quotations');
      if (res.ok) setPastQuotations(await res.json());
    } catch (e) {}
  };

  const saveCartLocally = (items, sqft) => {
    localStorage.setItem('pantrylk_cart', JSON.stringify({ items, sqft }));
  };

  // Categories Map
  const categoriesMap = useMemo(() => {
    const map = {};
    allProducts.forEach(p => {
      map[p.category] = (map[p.category] || 0) + 1;
    });
    return map;
  }, [allProducts]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    let prods = allProducts.filter(p => {
      const matchesCat = (activeCategory === 'All') || (p.category === activeCategory);
      if (!matchesCat) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const art = (p.articleNo || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return art.includes(q) || name.includes(q) || desc.includes(q);
    });

    if (sortOrder === 'price-asc') prods.sort((a, b) => a.mrp - b.mrp);
    else if (sortOrder === 'price-desc') prods.sort((a, b) => b.mrp - a.mrp);
    else if (sortOrder === 'name') prods.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'article') prods.sort((a, b) => a.articleNo.localeCompare(b.articleNo));

    return prods;
  }, [allProducts, activeCategory, searchQuery, sortOrder]);

  // Pagination Slice
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Live Totals Calculations
  const calculations = useMemo(() => {
    let compTotal = 0;
    currentQuote.items.forEach(item => {
      compTotal += item.quantity * item.mrp;
    });

    const labourRate = parseFloat(appSettings.labourRatePerSqFt) || 1800.0;
    const labourTotal = (parseFloat(currentQuote.sqft) || 0) * labourRate;
    const preCommTotal = compTotal + labourTotal;
    const commRate = parseFloat(appSettings.salesCommissionRate) || 5.0;
    const commTotal = preCommTotal * (commRate / 100);
    const grandTotal = preCommTotal + commTotal;

    return { compTotal, labourTotal, preCommTotal, commTotal, grandTotal, labourRate, commRate };
  }, [currentQuote.items, currentQuote.sqft, appSettings]);

  // Cart Operations
  const addItemToQuote = (product, qty = 1) => {
    setCurrentQuote(prev => {
      const existing = prev.items.find(i => i.id === product.id);
      let updatedItems;
      if (existing) {
        updatedItems = prev.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      } else {
        updatedItems = [...prev.items, {
          id: product.id,
          articleNo: product.articleNo,
          name: product.name,
          description: product.description,
          unit: product.unit,
          mrp: product.mrp,
          image: product.image,
          quantity: qty
        }];
      }
      saveCartLocally(updatedItems, prev.sqft);
      return { ...prev, items: updatedItems };
    });
    showToast(`Added ${product.articleNo} to quote`);
  };

  const updateItemQty = (prodId, delta) => {
    setCurrentQuote(prev => {
      const idx = prev.items.findIndex(i => i.id === prodId);
      if (idx === -1) return prev;
      let updatedItems;
      const newQty = prev.items[idx].quantity + delta;
      if (newQty <= 0) {
        updatedItems = prev.items.filter(i => i.id !== prodId);
      } else {
        updatedItems = prev.items.map(i => i.id === prodId ? { ...i, quantity: newQty } : i);
      }
      saveCartLocally(updatedItems, prev.sqft);
      return { ...prev, items: updatedItems };
    });
  };

  const setItemQty = (prodId, val) => {
    const qty = parseInt(val, 10);
    setCurrentQuote(prev => {
      let updatedItems;
      if (qty <= 0 || isNaN(qty)) {
        updatedItems = prev.items.filter(i => i.id !== prodId);
      } else {
        updatedItems = prev.items.map(i => i.id === prodId ? { ...i, quantity: qty } : i);
      }
      saveCartLocally(updatedItems, prev.sqft);
      return { ...prev, items: updatedItems };
    });
  };

  const removeItem = (prodId) => {
    setCurrentQuote(prev => {
      const updatedItems = prev.items.filter(i => i.id !== prodId);
      saveCartLocally(updatedItems, prev.sqft);
      return { ...prev, items: updatedItems };
    });
    showToast("Item removed");
  };

  const clearQuote = () => {
    if (currentQuote.items.length === 0 && !currentQuote.sqft) return;
    if (!confirm("Are you sure you want to clear this quotation?")) return;
    setCurrentQuote(prev => {
      saveCartLocally([], 0);
      return { ...prev, items: [], sqft: 0 };
    });
    showToast("Quotation cleared.");
  };

  // WhatsApp Share
  const shareViaWhatsApp = () => {
    const custName = currentQuote.customerName || 'Valued Customer';
    let phone = (currentQuote.customerPhone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '94' + phone.substring(1);
    else if (!phone.startsWith('94') && phone.length === 9) phone = '94' + phone;

    let itemsListText = '';
    currentQuote.items.forEach(item => {
      const total = item.quantity * item.mrp;
      itemsListText += `• *${item.articleNo}* - ${item.name} (${item.quantity} ${item.unit}) : ${formatLKR(total)}\n`;
    });

    const message = 
`*QUOTATION - PANTRY LK PVT LTD*
────────────────────────
📄 *Job No:* ${currentQuote.jobNo}
📅 *Date:* ${currentQuote.date}
👤 *Customer:* ${custName}
${currentQuote.customerPhone ? `📞 *Contact:* ${currentQuote.customerPhone}\n` : ''}${currentQuote.customerAddress ? `📍 *Address:* ${currentQuote.customerAddress}\n` : ''}
*ITEMIZED SUMMARY:*
${itemsListText || '• Custom Project Specifications\n'}
────────────────────────
📦 *Materials & Components:* ${formatLKR(calculations.compTotal)}
🛠️ *Labour & Machinery (${currentQuote.sqft} sq.ft @ Rs. ${calculations.labourRate}):* ${formatLKR(calculations.labourTotal)}
💼 *Sales Commission (${calculations.commRate}%):* ${formatLKR(calculations.commTotal)}
────────────────────────
🌟 *NET GRAND TOTAL: ${formatLKR(calculations.grandTotal)}*
────────────────────────
_Prepared by Pantry LK Pvt Ltd - Premium Kitchen Solutions_
_Hotline: ${appSettings.companyPhone}_`;

    const encoded = encodeURIComponent(message);
    const url = phone.length >= 9
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(url, '_blank');
    showToast("Opening WhatsApp with quotation summary!");
  };

  // Save Quotation to History
  const saveQuotationToHistory = async () => {
    const quoteRecord = {
      id: currentQuote.id || `quote_${Date.now()}`,
      jobNo: currentQuote.jobNo,
      date: currentQuote.date,
      customerName: currentQuote.customerName || 'Valued Customer',
      customerPhone: currentQuote.customerPhone || '',
      customerAddress: currentQuote.customerAddress || '',
      sqft: currentQuote.sqft,
      items: currentQuote.items,
      compTotal: calculations.compTotal,
      labourTotal: calculations.labourTotal,
      commissionTotal: calculations.commTotal,
      grandTotal: calculations.grandTotal,
      createdAt: new Date().toISOString()
    };

    try {
      await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteRecord)
      });
      loadQuotations();
      showToast("Quotation saved successfully!");
    } catch (e) {}
  };

  const doneAndShare = async () => {
    if (!currentQuote.customerName.trim()) {
      alert("Please enter Customer Name before sharing.");
      return;
    }
    await saveQuotationToHistory();
    shareViaWhatsApp();
  };

  // Admin Actions
  const saveFormulaRates = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appSettings)
      });
      showToast("Formula rates saved!");
    } catch (e) {}
  };

  const saveCompanyInfo = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appSettings)
      });
      showToast("Company information updated!");
    } catch (e) {}
  };

  const resetToDefaultPdfCatalog = async () => {
    if (!confirm("Are you sure you want to reset all products back to original PDF catalog values?")) return;
    try {
      const res = await fetch('/api/products/reset', { method: 'POST' });
      if (res.ok) {
        await loadProducts();
        showToast("Catalog reset to PDF data successfully!");
      }
    } catch (e) {}
  };

  const deleteProduct = async (id) => {
    if (!confirm("Delete this component from catalog?")) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      setAllProducts(prev => prev.filter(p => p.id !== id));
      showToast("Component deleted.");
    } catch (e) {}
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const isEdit = !!editingProduct?.id;
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/api/products/${editingProduct.id}` : '/api/products';

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct)
      });
      await loadProducts();
      setIsProductModalOpen(false);
      showToast(isEdit ? "Component updated!" : "Component added!");
    } catch (e) {}
  };

  // Category Icon helper
  const getCategoryIcon = (cat, isAct = false) => {
    const iconClass = `w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isAct ? 'text-teal-300' : ''}`;
    if (cat.includes('AGT')) return <Box className={`${iconClass} ${!isAct ? 'text-amber-500' : ''}`} />;
    if (cat.includes('HeveaBoard')) return <Grid className={`${iconClass} ${!isAct ? 'text-amber-600' : ''}`} />;
    if (cat.includes('LG HI-MACS')) return <Sparkles className={`${iconClass} ${!isAct ? 'text-emerald-500' : ''}`} />;
    if (cat.includes('Aluminium Handles')) return <Layers className={`${iconClass} ${!isAct ? 'text-cyan-500' : ''}`} />;
    if (cat.includes('Cutlery')) return <ShoppingBag className={`${iconClass} ${!isAct ? 'text-blue-500' : ''}`} />;
    if (cat.includes('Hardware')) return <Wrench className={`${iconClass} ${!isAct ? 'text-indigo-500' : ''}`} />;
    if (cat.includes('Kitchen Tall')) return <Building2 className={`${iconClass} ${!isAct ? 'text-teal-500' : ''}`} />;
    if (cat.includes('Lighting')) return <Lightbulb className={`${iconClass} ${!isAct ? 'text-yellow-500' : ''}`} />;
    if (cat.includes('PVC Wall')) return <Layers className={`${iconClass} ${!isAct ? 'text-rose-500' : ''}`} />;
    if (cat.includes('Wardrobe')) return <Sliders className={`${iconClass} ${!isAct ? 'text-purple-500' : ''}`} />;
    if (cat.includes('SCHOCK')) return <Droplets className={`${iconClass} ${!isAct ? 'text-sky-500' : ''}`} />;
    if (cat.includes('VESTEL')) return <Flame className={`${iconClass} ${!isAct ? 'text-orange-500' : ''}`} />;
    return <Layers className={iconClass} />;
  };

  const totalCartCount = currentQuote.items.reduce((s, i) => s + i.quantity, 0);

  // Common Quote Calculator View (Used in Desktop Sidebar and Mobile Bottom Sheet)
  const renderQuoteCalculatorContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 sm:p-2 bg-teal-500/20 text-teal-400 rounded-lg border border-teal-500/30">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base tracking-tight">Active Quotation</h2>
            <p className="text-[10px] sm:text-[11px] text-slate-300">Live Itemized Calculator</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <button onClick={clearQuote} className="text-xs text-slate-300 hover:text-rose-400 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-slate-800 transition">
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Clear</span>
          </button>
          {isMobile && (
            <button onClick={() => setIsMobileDrawerOpen(false)} className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 min-h-[160px] max-h-[300px] sm:max-h-[340px] divide-y divide-slate-100">
        {currentQuote.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 px-4 text-slate-400 space-y-2">
            <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300" />
            <p className="text-xs sm:text-sm font-semibold text-slate-600">No components selected yet</p>
            <p className="text-[11px] text-slate-400 max-w-[220px]">Select items from the catalog to see rate multiplication live.</p>
          </div>
        ) : (
          currentQuote.items.map(item => (
            <div key={item.id} className="pt-2 flex items-center justify-between space-x-2">
              <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center p-0.5">
                <img src={item.image || '/images/placeholder.png'} className="max-h-full max-w-full object-contain" alt={item.name} />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xs text-slate-900 font-mono">{item.articleNo}</span>
                  <span className="text-[10px] text-slate-500 truncate block">{item.name}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {formatLKR(item.mrp)} × <span className="font-bold text-slate-700">{item.quantity}</span> {item.unit}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-slate-900 font-mono">
                  {formatLKR(item.quantity * item.mrp)}
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button onClick={() => updateItemQty(item.id, -1)} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs flex items-center justify-center font-bold touch-manipulation">-</button>
                  <span className="text-xs font-mono font-bold px-1">{item.quantity}</span>
                  <button onClick={() => updateItemQty(item.id, 1)} className="w-6 h-6 rounded bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs flex items-center justify-center font-bold touch-manipulation">+</button>
                  <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600 ml-1 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Calculations & Extra Charges Section */}
      <div className="bg-slate-50 border-t border-slate-200 p-3.5 sm:p-4 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Components Subtotal:</span>
          <span className="font-bold text-slate-900 font-mono">{formatLKR(calculations.compTotal)}</span>
        </div>

        {/* Labour & Machinery Input */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Hammer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
              <label className="text-[11px] sm:text-xs font-bold text-slate-700">Labour & Machinery Charge</label>
            </div>
            <span className="text-[9px] sm:text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-mono font-semibold border border-amber-200/60">
              @ {formatLKR(calculations.labourRate)} / sq.ft
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Square Feet (e.g. 100)"
                value={currentQuote.sqft || ''}
                onChange={(e) => setCurrentQuote(q => ({ ...q, sqft: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-2.5 pr-12 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">sq.ft</span>
            </div>
            <span className="text-xs font-bold text-amber-700 font-mono shrink-0">
              {formatLKR(calculations.labourTotal)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
          <span>Subtotal (Items + Labour):</span>
          <span className="font-semibold text-slate-700 font-mono">{formatLKR(calculations.preCommTotal)}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-teal-800 bg-teal-50/80 px-2.5 py-1.5 rounded-lg border border-teal-200/60">
          <div className="flex items-center space-x-1">
            <Percent className="w-3 h-3 text-teal-600" />
            <span className="font-semibold text-[11px] sm:text-xs">Sales Commission ({calculations.commRate}%):</span>
          </div>
          <span className="font-bold text-teal-900 font-mono text-xs">{formatLKR(calculations.commTotal)}</span>
        </div>

        {/* Grand Total */}
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-3 rounded-xl shadow-md space-y-0.5">
          <div className="flex items-center justify-between text-[11px] text-teal-300 font-medium">
            <span>QUOTATION GRAND TOTAL</span>
            <span className="text-[9px] bg-teal-500/30 text-teal-200 px-1 py-0.2 rounded font-mono">LKR</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-slate-300">Net Payable:</span>
            <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-emerald-400">
              {formatLKR(calculations.grandTotal)}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            if (isMobile) setIsMobileDrawerOpen(false);
            setIsQuoteModalOpen(true);
          }}
          className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-xl shadow-amber-500/25 border-2 border-amber-300 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 touch-manipulation ring-2 ring-amber-400/40"
        >
          <FileCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          <span className="tracking-wider uppercase font-black">Generate Official Quotation</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 pb-20 lg:pb-0">

      {/* TOP NAVBAR */}
      <nav className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Logo & Brand */}
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('maker')}>
              <img
                src="/images/logo.jpg"
                alt="Pantry LK Logo"
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl bg-white p-0.5 shadow-md shadow-teal-500/20 shrink-0"
              />
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-base sm:text-xl tracking-tight text-white">PANTRY LK</span>
                  <span className="bg-teal-500/20 text-teal-300 text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-semibold border border-teal-500/30">Pvt Ltd</span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block">Next.js Quotation Maker & Catalog</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setActiveTab('maker')}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'maker' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Quotation</span>
                {totalCartCount > 0 && (
                  <span className="bg-white text-teal-900 text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-bold">
                    {totalCartCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                  activeTab === 'history' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline">Past Quotations</span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                  activeTab === 'admin' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline">Admin</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* TOAST NOTIFICATION */}
      <div
        className={`fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 transition-all duration-300 flex items-center space-x-2.5 bg-slate-900 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl shadow-2xl border border-slate-700 pointer-events-none max-w-[90vw] no-print toast-container ${
          toast.show ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
        }`}
      >
        {toast.isSuccess ? (
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 shrink-0" />
        )}
        <div className="text-xs sm:text-sm font-medium truncate">{toast.message}</div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-8 no-print">

        {/* TAB 1: QUOTATION MAKER */}
        {activeTab === 'maker' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Catalog Browser */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              
              {/* Search & Category Header Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3.5 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                  {/* Search input */}
                  <div className="relative w-full">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search Article No (e.g. 378, 6002), Name, or Keyword..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Sort dropdown */}
                  <div className="flex items-center space-x-1.5 shrink-0 w-full sm:w-auto justify-end">
                    <span className="text-[11px] text-slate-500 font-medium">Sort:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="default">Default Order</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="name">Name (A-Z)</option>
                      <option value="article">Article No</option>
                    </select>
                  </div>
                </div>

                {/* Large Category Selection Grid / Flow */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-800 tracking-wide uppercase">Select Category</span>
                      <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/60 font-mono">
                        {filteredProducts.length} items
                      </span>
                    </div>
                    {activeCategory !== 'All' && (
                      <button
                        onClick={() => { setActiveCategory('All'); setCurrentPage(1); }}
                        className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center space-x-1 transition"
                      >
                        <span>View All Categories</span>
                      </button>
                    )}
                  </div>

                  {/* Large Buttons: organized responsive grid on mobile & desktop */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
                    {/* "All Items" Button */}
                    <button
                      onClick={() => { setActiveCategory('All'); setCurrentPage(1); }}
                      className={`flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 touch-manipulation shadow-xs active:scale-98 ${
                        activeCategory === 'All'
                          ? 'bg-slate-900 text-white ring-2 ring-teal-500 shadow-md shadow-slate-900/20'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 hover:border-teal-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                        <div className={`p-1.5 rounded-lg shrink-0 ${activeCategory === 'All' ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-100 text-slate-600'}`}>
                          <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="truncate">All Items</span>
                      </div>
                      <span className={`ml-2 text-[11px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        activeCategory === 'All' ? 'bg-teal-500/30 text-teal-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {allProducts.length}
                      </span>
                    </button>

                    {/* Dynamic Category Buttons */}
                    {Object.keys(categoriesMap).sort().map(cat => {
                      const isAct = activeCategory === cat;
                      const count = categoriesMap[cat];
                      return (
                        <button
                          key={cat}
                          onClick={() => { setActiveCategory(cat); setCurrentPage(1); }}
                          className={`flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 touch-manipulation shadow-xs active:scale-98 text-left ${
                            isAct
                              ? 'bg-slate-900 text-white ring-2 ring-teal-500 shadow-md shadow-slate-900/20'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 hover:border-teal-400'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isAct ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-100 text-slate-600'}`}>
                              {getCategoryIcon(cat, isAct)}
                            </div>
                            <span className="truncate" title={cat}>{cat}</span>
                          </div>
                          <span className={`ml-2 text-[11px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            isAct ? 'bg-teal-500/30 text-teal-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {paginatedProducts.length === 0 ? (
                  <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
                    <PackageSearch className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-700 text-sm">No matching components found</h4>
                    <button onClick={() => { setSearchQuery(''); setActiveCategory('All'); }} className="mt-3 px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-semibold">
                      View All Components
                    </button>
                  </div>
                ) : (
                  paginatedProducts.map(p => {
                    const inCart = currentQuote.items.find(i => i.id === p.id);
                    const qty = inCart ? inCart.quantity : 0;
                    return (
                      <div
                        key={p.id}
                        className={`product-card bg-white rounded-2xl p-3.5 flex flex-col justify-between relative group ${
                          qty > 0 ? 'ring-2 ring-teal-500 bg-teal-50/20' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="badge-tag bg-slate-100 text-slate-700 font-mono font-bold text-[11px]">{p.articleNo}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium truncate max-w-[120px]">
                              {p.catalog || p.category}
                            </span>
                          </div>

                          <div className="w-full h-32 sm:h-36 bg-slate-50 rounded-xl overflow-hidden mb-2.5 border border-slate-100 flex items-center justify-center relative p-2">
                            <img
                              src={p.image || '/images/placeholder.png'}
                              alt={p.name}
                              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                            {qty > 0 && (
                              <span className="absolute top-2 right-2 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                In Quote ({qty})
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2" title={p.name}>
                            {p.name}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 line-clamp-2" title={p.description}>
                            {p.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline space-x-1">
                              <span className="text-sm font-extrabold text-slate-900 font-mono">{formatLKR(p.mrp)}</span>
                              <span className="text-[10px] text-slate-400 font-medium">/ {p.unit}</span>
                            </div>
                            {p.perSqfRate && (
                              <span className="text-[10px] text-teal-700 font-mono">Rs. {p.perSqfRate}/sqf</span>
                            )}
                          </div>

                          {qty > 0 ? (
                            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl p-1">
                              <button onClick={() => updateItemQty(p.id, -1)} className="w-7 h-7 rounded-lg bg-white text-teal-800 hover:bg-teal-100 flex items-center justify-center font-bold text-sm touch-manipulation">
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) => setItemQty(p.id, e.target.value)}
                                className="w-12 text-center text-xs font-bold font-mono bg-transparent border-0 focus:outline-none"
                              />
                              <button onClick={() => updateItemQty(p.id, 1)} className="w-7 h-7 rounded-lg bg-teal-600 text-white hover:bg-teal-700 flex items-center justify-center font-bold text-sm touch-manipulation">
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addItemToQuote(p, 1)}
                              className="w-full py-1.5 px-3 bg-slate-900 hover:bg-teal-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center justify-center space-x-1 touch-manipulation"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Quote</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {filteredProducts.length > 0 && (
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
                  <span className="text-[11px] truncate mr-2">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} items
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="px-1.5 py-0.5 text-xs font-bold text-teal-700">{currentPage}</span>
                    <button
                      disabled={currentPage * itemsPerPage >= filteredProducts.length}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Right Sidebar: Quotation Calculator */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-4 quote-sidebar bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden">
              {renderQuoteCalculatorContent(false)}
            </div>

          </div>
        )}

        {/* TAB 2: PAST QUOTATIONS */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Saved Quotations & Job History</h2>
                <p className="text-xs text-slate-500">View, reload, or share previous client quotations.</p>
              </div>
              <button onClick={loadQuotations} className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-left text-xs sm:text-sm min-w-[550px]">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Job No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-2 text-center">Items</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pastQuotations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                        No saved quotations in history yet.
                      </td>
                    </tr>
                  ) : (
                    pastQuotations.map(q => (
                      <tr key={q.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-teal-800 text-xs">{q.jobNo}</td>
                        <td className="py-2.5 px-3 text-[11px]">{q.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 text-xs">{q.customerName}</td>
                        <td className="py-2.5 px-3 text-[11px] font-mono text-slate-500">{q.customerPhone || '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-xs">{q.items ? q.items.length : 0}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 text-xs">{formatLKR(q.grandTotal)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => {
                                setCurrentQuote({
                                  id: q.id,
                                  jobNo: q.jobNo,
                                  date: q.date,
                                  customerName: q.customerName,
                                  customerPhone: q.customerPhone,
                                  customerAddress: q.customerAddress,
                                  sqft: q.sqft || 0,
                                  items: q.items || []
                                });
                                setActiveTab('maker');
                                showToast(`Loaded ${q.jobNo} into editor!`);
                              }}
                              title="Reload into Editor"
                              className="p-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm("Delete this quotation?")) return;
                                await fetch(`/api/quotations/${q.id}`, { method: 'DELETE' });
                                setPastQuotations(prev => prev.filter(item => item.id !== q.id));
                                showToast("Quotation deleted.");
                              }}
                              title="Delete"
                              className="p-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN DASHBOARD */}
        {activeTab === 'admin' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" />
                  <h2 className="text-base sm:text-xl font-bold">Admin Management Center</h2>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">Configure formula rates, catalog components, and quotation terms.</p>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setEditingProduct({
                      articleNo: '',
                      category: 'Custom Components',
                      name: '',
                      description: '',
                      unit: 'No',
                      mrp: 0,
                      image: ''
                    });
                    setIsProductModalOpen(true);
                  }}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Component</span>
                </button>
                <button
                  onClick={resetToDefaultPdfCatalog}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset PDF Data</span>
                </button>
              </div>
            </div>

            {/* Formula & Company Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
                  <Sliders className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900">Charge Formula Settings</h3>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Labour & Machinery Charge (LKR / Sq.Ft)</label>
                    <input
                      type="number"
                      value={appSettings.labourRatePerSqFt}
                      onChange={(e) => setAppSettings(s => ({ ...s, labourRatePerSqFt: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">Sales Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={appSettings.salesCommissionRate}
                      onChange={(e) => setAppSettings(s => ({ ...s, salesCommissionRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold font-mono"
                    />
                  </div>
                  <button onClick={saveFormulaRates} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition">
                    Save Formula Rates
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900">Company Information</h3>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center space-x-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <img
                      src="/images/logo.jpg"
                      alt="Current Company Logo"
                      className="w-12 h-10 object-contain rounded bg-white p-1 border border-slate-200 shadow-xs"
                    />
                    <div>
                      <div className="font-bold text-slate-800 text-[11px]">Official Company Logo</div>
                      <div className="text-[10px] text-slate-500">public/images/logo.jpg (Active on Quotation Views)</div>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Company Name</label>
                    <input
                      type="text"
                      value={appSettings.companyName}
                      onChange={(e) => setAppSettings(s => ({ ...s, companyName: e.target.value }))}
                      className="w-full p-1.5 sm:p-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Phone</label>
                      <input
                        type="text"
                        value={appSettings.companyPhone}
                        onChange={(e) => setAppSettings(s => ({ ...s, companyPhone: e.target.value }))}
                        className="w-full p-1.5 sm:p-2 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Email</label>
                      <input
                        type="text"
                        value={appSettings.companyEmail}
                        onChange={(e) => setAppSettings(s => ({ ...s, companyEmail: e.target.value }))}
                        className="w-full p-1.5 sm:p-2 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                  <button onClick={saveCompanyInfo} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition">
                    Save Company Info
                  </button>
                </div>
              </div>

            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">Component Catalog Inventory ({allProducts.length} items)</h3>
                <div className="w-full sm:w-72 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter inventory..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[460px] overflow-y-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold sticky top-0 border-b border-slate-200 z-10 text-[10px]">
                    <tr>
                      <th className="py-2 px-2.5">Photo</th>
                      <th className="py-2 px-2.5">Code</th>
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-2.5">Description</th>
                      <th className="py-2 px-2">Unit</th>
                      <th className="py-2 px-2.5 text-right">MRP (Rs.)</th>
                      <th className="py-2 px-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allProducts
                      .filter(p => !adminSearch || p.articleNo?.toLowerCase().includes(adminSearch.toLowerCase()) || p.name?.toLowerCase().includes(adminSearch.toLowerCase()))
                      .slice(0, 100)
                      .map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="py-1.5 px-2.5">
                            <img src={p.image || '/images/placeholder.png'} className="w-7 h-7 object-contain rounded border border-slate-200" alt={p.name} />
                          </td>
                          <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900 text-[11px]">{p.articleNo}</td>
                          <td className="py-1.5 px-2.5 text-slate-500 text-[11px] truncate max-w-[120px]">{p.category}</td>
                          <td className="py-1.5 px-2.5">
                            <div className="font-semibold text-slate-800 line-clamp-1 text-[11px]">{p.name}</div>
                          </td>
                          <td className="py-1.5 px-2 font-mono text-slate-500 text-[11px]">{p.unit}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 text-[11px]">{formatLKR(p.mrp)}</td>
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                                className="p-1 rounded text-teal-600 hover:bg-teal-50"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteProduct(p.id)} className="p-1 rounded text-rose-500 hover:bg-rose-50">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* MOBILE STICKY BOTTOM FLOATING BAR (Appears on screens < lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-800 px-4 py-2.5 shadow-2xl flex items-center justify-between no-print">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <ShoppingBag className="w-4 h-4" />
            </div>
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {totalCartCount}
              </span>
            )}
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Net Grand Total</div>
            <div className="text-sm font-black font-mono text-emerald-400">{formatLKR(calculations.grandTotal)}</div>
          </div>
        </div>

        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-amber-500/25 border border-amber-300 flex items-center space-x-1.5 transition active:scale-95 touch-manipulation ring-2 ring-amber-400/40"
        >
          <span>View & Generate ({totalCartCount})</span>
          <ChevronUp className="w-4 h-4 text-slate-950 stroke-[2.5]" />
        </button>
      </div>

      {/* MOBILE SLIDE-UP DRAWER (Bottom Sheet Modal) */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            {renderQuoteCalculatorContent(true)}
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL QUOTATION VIEW & EXPORT */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs overflow-y-auto p-0 sm:p-4 md:p-6 flex items-center justify-center print-modal-overlay">
          <div className="bg-white w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col print-modal-card">
            
            {/* Top Bar */}
            <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 no-print shrink-0">
              <div className="flex items-center space-x-2.5">
                <button onClick={() => setIsQuoteModalOpen(false)} className="sm:hidden p-1 mr-0.5 text-slate-300 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img
                  src="/images/logo.jpg"
                  alt="Pantry LK"
                  className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-lg bg-white p-0.5 shrink-0 shadow-sm"
                />
                <div>
                  <h3 className="font-bold text-xs sm:text-sm tracking-tight">Official Quotation</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Pantry LK Pvt Ltd</p>
                </div>
              </div>

              {/* Larger Action Buttons in Top Bar */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  onClick={saveQuotationToHistory}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm border border-slate-700 transition flex items-center space-x-1.5 active:scale-95 touch-manipulation"
                  title="Save quotation to history"
                >
                  <Save className="w-4 h-4 text-teal-400" />
                  <span>Save</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-95 touch-manipulation"
                  title="Print quotation"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-95 touch-manipulation"
                  title="Save / Export as PDF file"
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF File</span>
                </button>

                <button
                  onClick={shareViaWhatsApp}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-95 touch-manipulation"
                  title="Share quotation via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer Inputs */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-3.5 no-print shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600" />
                  <span>Customer & Job Details</span>
                </span>
                <button
                  onClick={saveQuotationToHistory}
                  className="px-3.5 py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-300 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-teal-700" />
                  <span>Save to History</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">Customer Name *</label>
                  <input
                    type="text"
                    value={currentQuote.customerName}
                    placeholder="e.g. Mr. John Silva"
                    onChange={(e) => setCurrentQuote(q => ({ ...q, customerName: e.target.value }))}
                    className="w-full p-1.5 sm:p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">Contact (WhatsApp) *</label>
                  <input
                    type="text"
                    value={currentQuote.customerPhone}
                    placeholder="e.g. 077 123 4567"
                    onChange={(e) => setCurrentQuote(q => ({ ...q, customerPhone: e.target.value }))}
                    className="w-full p-1.5 sm:p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">Job / Quotation No *</label>
                  <input
                    type="text"
                    value={currentQuote.jobNo}
                    onChange={(e) => setCurrentQuote(q => ({ ...q, jobNo: e.target.value }))}
                    className="w-full p-1.5 sm:p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">Customer Address</label>
                  <input
                    type="text"
                    value={currentQuote.customerAddress}
                    placeholder="e.g. Colombo 07"
                    onChange={(e) => setCurrentQuote(q => ({ ...q, customerAddress: e.target.value }))}
                    className="w-full p-1.5 sm:p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Printable Sheet */}
            <div id="printable-quotation-sheet" className="flex-1 overflow-y-auto p-4 sm:p-7 md:p-8 bg-white print-page">
              
              {/* Quotation Header with Official Logo */}
              <div className="border-b-2 border-slate-900 pb-3 mb-3 sm:pb-4 sm:mb-4 flex flex-row justify-between items-center gap-3">
                <div className="flex items-center space-x-3">
                  <img
                    src="/images/logo.jpg"
                    alt="Pantry LK Pvt Ltd Logo"
                    className="h-12 sm:h-14 w-auto object-contain rounded shrink-0 print:h-11"
                  />
                  <div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <span className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">PANTRY LK</span>
                      <span className="bg-slate-900 text-teal-400 text-[10px] sm:text-xs px-2 py-0.5 rounded font-bold">PVT LTD</span>
                    </div>
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-600 mt-0.5">PREMIUM MODERN KITCHEN & PANTRY SOLUTIONS</p>
                    <p className="text-[9px] sm:text-xs text-slate-500">{appSettings.companyAddress} | Hotline: {appSettings.companyPhone}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block bg-teal-800 text-white text-[10px] sm:text-xs uppercase font-extrabold px-2.5 py-0.5 rounded tracking-wider mb-1">OFFICIAL QUOTATION</span>
                  <div className="text-[10px] sm:text-xs text-slate-600 space-y-0.5 font-mono">
                    <div>Job No: <span className="font-bold text-slate-900">{currentQuote.jobNo}</span></div>
                    <div>Date: <span className="font-medium text-slate-800">{currentQuote.date}</span></div>
                    <div>Validity: <span className="font-medium text-slate-800">14 Days</span></div>
                  </div>
                </div>
              </div>

              {/* Customer & Scope Info Box */}
              <div className="bg-slate-50 rounded-lg p-2.5 sm:p-3 border border-slate-200 mb-3 grid grid-cols-2 gap-2 text-xs print:p-2 print:mb-2 print:border-slate-300">
                <div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Quotation Prepared For</div>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 print:text-xs">{currentQuote.customerName || 'Valued Customer'}</div>
                  <div className="text-slate-600 mt-0.5 text-[10px] print:text-[9px]">{currentQuote.customerAddress ? `Address: ${currentQuote.customerAddress}` : 'Address: Not specified'}</div>
                  <div className="text-slate-600 mt-0.5 text-[10px] print:text-[9px]">{currentQuote.customerPhone ? `Contact: ${currentQuote.customerPhone}` : 'Contact: Not specified'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Project Scope</div>
                  <div className="font-semibold text-slate-800 mt-0.5 text-xs print:text-xs">Pantry & Cabinetry Fabrication</div>
                  <div className="text-slate-600 mt-0.5 text-[10px] print:text-[9px]">Machinery & Labour: {currentQuote.sqft} sq.ft</div>
                  <div className="text-teal-700 font-medium mt-0.5 text-[10px] print:text-[9px]">Sales Commission: {calculations.commRate}% Included</div>
                </div>
              </div>

              {/* Mobile Swipe Notice */}
              <div className="sm:hidden flex items-center space-x-1 text-[10px] text-slate-400 italic mb-1.5 no-print">
                <ArrowRightLeft className="w-3 h-3" />
                <span>Swipe table horizontally to inspect all columns</span>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto mb-3 sm:mb-4 -mx-4 sm:mx-0 px-4 sm:px-0 print:overflow-visible print:mx-0 print:px-0 print:mb-2">
                <table className="w-full text-left text-xs border border-slate-200 min-w-[560px] quotation-table print:min-w-full print:border-slate-300 print:text-[10px]">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] sm:text-[11px] font-semibold print:text-[9px]">
                    <tr>
                      <th className="py-1.5 px-2 text-center w-8 print:py-1">#</th>
                      <th className="py-1.5 px-1.5 w-10 text-center print:py-1">Image</th>
                      <th className="py-1.5 px-2 print:py-1">Article / Description</th>
                      <th className="py-1.5 px-1.5 text-center w-12 print:py-1">Unit</th>
                      <th className="py-1.5 px-2 text-right w-24 print:py-1">Rate (LKR)</th>
                      <th className="py-1.5 px-1.5 text-center w-12 print:py-1">Qty</th>
                      <th className="py-1.5 px-2 text-right w-28 print:py-1">Amount (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 text-[11px] print:text-[10px] print:divide-slate-300">
                    {currentQuote.items.map((item, idx) => (
                      <tr key={item.id} className="print:break-inside-avoid">
                        <td className="py-1 px-2 text-center text-slate-500 font-mono print:py-0.5">{idx + 1}</td>
                        <td className="py-1 px-1.5 text-center print:py-0.5">
                          <img src={item.image || '/images/placeholder.png'} className="w-7 h-7 object-contain rounded border border-slate-200 mx-auto quotation-item-img print:w-6 print:h-6" alt={item.name} />
                        </td>
                        <td className="py-1 px-2 print:py-0.5">
                          <div className="font-bold text-slate-900 leading-tight">{item.articleNo}</div>
                          <div className="text-[10px] text-slate-600 line-clamp-1 print:text-[9px]">{item.name}</div>
                          {item.description && <div className="text-[9px] text-slate-400 line-clamp-1 print:text-[8px]">{item.description}</div>}
                        </td>
                        <td className="py-1 px-1.5 text-center text-slate-600 font-mono print:py-0.5">{item.unit}</td>
                        <td className="py-1 px-2 text-right font-mono print:py-0.5">{formatLKR(item.mrp)}</td>
                        <td className="py-1 px-1.5 text-center font-mono font-bold print:py-0.5">{item.quantity}</td>
                        <td className="py-1 px-2 text-right font-mono font-bold print:py-0.5">{formatLKR(item.quantity * item.mrp)}</td>
                      </tr>
                    ))}

                    {/* ONLY ONE GRAND TOTAL AT THE VERY END (Inside tbody so it NEVER repeats across page breaks) */}
                    <tr className="border-t-2 border-slate-900 bg-slate-50 font-semibold text-[10px] print:text-[9px] print:break-inside-avoid">
                      <td colSpan="6" className="py-1 px-2 text-right text-slate-600 print:py-0.5">Equipment Subtotal:</td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-slate-900 print:py-0.5 whitespace-nowrap">{formatLKR(calculations.compTotal)}</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-[10px] print:text-[9px] print:border-slate-300 print:break-inside-avoid">
                      <td colSpan="6" className="py-1 px-2 text-right text-slate-600 print:py-0.5">
                        Labour & Machinery ({currentQuote.sqft} sq.ft @ {formatLKR(calculations.labourRate)}):
                      </td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-amber-800 print:py-0.5 whitespace-nowrap">{formatLKR(calculations.labourTotal)}</td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-100/60 font-semibold text-[10px] print:text-[9px] print:border-slate-300 print:break-inside-avoid">
                      <td colSpan="6" className="py-1 px-2 text-right text-slate-700 print:py-0.5">Subtotal (Materials + Labour):</td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-slate-900 print:py-0.5 whitespace-nowrap">{formatLKR(calculations.preCommTotal)}</td>
                    </tr>
                    <tr className="border-b-2 border-slate-900 bg-teal-50/60 font-semibold text-[10px] print:text-[9px] print:border-b-2 print:break-inside-avoid">
                      <td colSpan="6" className="py-1 px-2 text-right text-teal-900 font-bold print:py-0.5">Sales Commission ({calculations.commRate}%):</td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-teal-800 print:py-0.5 whitespace-nowrap">{formatLKR(calculations.commTotal)}</td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-extrabold text-xs print:text-[11px] print:break-inside-avoid">
                      <td colSpan="6" className="py-1.5 px-2 text-right tracking-wide text-teal-300 print:py-1">NET GRAND TOTAL:</td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-emerald-400 text-xs sm:text-sm print:text-xs print:py-1 whitespace-nowrap">{formatLKR(calculations.grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Amount in Words */}
              <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] print:text-[9px] print:p-1.5 print:mb-2 print:border-slate-300 print:break-inside-avoid">
                <span className="text-slate-500 font-semibold">Amount in Words: </span>
                <span className="font-bold text-slate-800 uppercase">{numberToWords(calculations.grandTotal)}</span>
              </div>

              {/* Terms & Conditions */}
              <div className="border-t border-slate-200 pt-2 mb-2.5 text-[9px] text-slate-500 leading-tight print:text-[8px] print:pt-1.5 print:mb-2 print:border-slate-300 print:break-inside-avoid">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[8px] mb-0.5">Terms & Conditions</div>
                <div className="whitespace-pre-line leading-relaxed">{appSettings.termsAndConditions}</div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-2 border-t border-slate-200 text-xs print:pt-1.5 print:gap-6 print:border-slate-300 print:break-inside-avoid">
                <div className="text-center">
                  <div className="h-8 border-b border-dashed border-slate-400 flex items-end justify-center pb-0.5">
                    <span className="text-slate-400 italic text-[9px]">Pantry LK Pvt Ltd</span>
                  </div>
                  <p className="font-bold text-slate-800 mt-1 text-[10px] print:text-[9px]">Authorized Signature</p>
                  <p className="text-[8px] text-slate-400">Pantry LK Pvt Ltd</p>
                </div>
                <div className="text-center">
                  <div className="h-8 border-b border-dashed border-slate-400 flex items-end justify-center pb-0.5">
                    <span className="text-slate-400 italic text-[9px]">Customer Acceptance</span>
                  </div>
                  <p className="font-bold text-slate-800 mt-1 text-[10px] print:text-[9px]">Customer Acceptance</p>
                  <p className="text-[8px] text-slate-400">Signature & Date</p>
                </div>
              </div>

            </div>

            {/* Bottom Actions with Bit Larger Buttons */}
            <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 no-print shrink-0">
              <span className="text-xs text-slate-500 hidden lg:inline">
                Pantry LK Formal Quotation • Ready to export, print, or share directly
              </span>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition"
                >
                  Back
                </button>

                <button
                  onClick={saveQuotationToHistory}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm border border-slate-700 transition flex items-center space-x-1.5 active:scale-95"
                >
                  <Save className="w-4 h-4 text-teal-400" />
                  <span>Save Quotation</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  <span>Save as PDF</span>
                </button>

                <button
                  onClick={doneAndShare}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition flex items-center space-x-2 touch-manipulation"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share (WhatsApp)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-3.5 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-sm sm:text-base text-slate-900">{editingProduct?.id ? 'Edit Component' : 'Add New Component'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Article No / Code *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct?.articleNo || ''}
                    onChange={(e) => setEditingProduct(p => ({ ...p, articleNo: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Category *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct?.category || ''}
                    onChange={(e) => setEditingProduct(p => ({ ...p, category: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Product Title / Name *</label>
                <input
                  type="text"
                  required
                  value={editingProduct?.name || ''}
                  onChange={(e) => setEditingProduct(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Full Description</label>
                <textarea
                  rows="2"
                  value={editingProduct?.description || ''}
                  onChange={(e) => setEditingProduct(p => ({ ...p, description: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Unit *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct?.unit || 'No'}
                    onChange={(e) => setEditingProduct(p => ({ ...p, unit: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">MRP Price (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct?.mrp || ''}
                    onChange={(e) => setEditingProduct(p => ({ ...p, mrp: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Image URL / Path</label>
                <input
                  type="text"
                  value={editingProduct?.image || ''}
                  placeholder="images/products/...jpg"
                  onChange={(e) => setEditingProduct(p => ({ ...p, image: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold shadow-sm text-xs">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
