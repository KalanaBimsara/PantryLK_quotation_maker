'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers, Calculator, History, Settings, Search, X, ShoppingBag,
  Receipt, Trash2, Percent, Hammer, FileCheck, RefreshCw, Edit3,
  MessageCircle, Plus, RotateCcw, Printer, Save, CheckCircle,
  AlertTriangle, Sliders, Building2, UserCheck, Check, Edit2,
  PackageSearch, ChevronUp, ChevronDown, ArrowRightLeft, ArrowLeft,
  Box, Grid, Sparkles, Wrench, Lightbulb, Droplets, Flame, LayoutGrid, FileText,
  Database, Cloud, UploadCloud, Copy, ExternalLink, ShieldCheck,
  Lock, Unlock, Eye, EyeOff, KeyRound, LogOut, Store, Package
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedShops, setSelectedShops] = useState(['PDS', 'Polimise', 'MM Noorbhoy']);
  const [maxPrice, setMaxPrice] = useState(600000); // 600,000 indicates all prices / no upper limit
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  // Direct Database Query State
  const [dbProducts, setDbProducts] = useState([]);
  const [totalDbCount, setTotalDbCount] = useState(0);
  const [totalDbPages, setTotalDbPages] = useState(1);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);

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
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Supabase Cloud Sync State
  const [supabaseStatus, setSupabaseStatus] = useState({
    connected: false,
    loading: true,
    url: 'https://dngdvqkvhtabpfskmhan.supabase.co',
    tables: {
      products: { ready: false, count: 0 },
      quotations: { ready: false, count: 0 },
      settings: { ready: false, count: 0 }
    }
  });
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

  // Admin Authentication State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAdminAuthenticating, setIsAdminAuthenticating] = useState(false);

  // Admin Catalog Search
  const [adminSearch, setAdminSearch] = useState('');

  // Currency helper
  const formatLKR = (val) => {
    const num = parseFloat(val) || 0;
    return 'Rs. ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Image path resolver with placeholder fallback
  const resolveProductImage = (img) => {
    if (!img) return '/images/placeholder.svg';
    return img.startsWith('/') ? img : '/' + img;
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
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('pantrylk_cart'); // Clear any legacy local data
        if (sessionStorage.getItem('pantrylk_admin_auth') === 'true') {
          setIsAdminUnlocked(true);
        }
      } catch (e) {}
    }

    loadSettings();
    loadProducts();
    loadQuotations();
    checkSupabaseStatus();

    const d = new Date();
    const yr = d.getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    const newJobNo = `PLK-${yr}-${rand}`;
    const newDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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

  const checkSupabaseStatus = async () => {
    try {
      const res = await fetch('/api/supabase/status');
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus({ ...data, loading: false });
      } else {
        setSupabaseStatus(prev => ({ ...prev, loading: false, connected: false }));
      }
    } catch (e) {
      setSupabaseStatus(prev => ({ ...prev, loading: false, connected: false }));
    }
  };

  const syncToSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await fetch('/api/supabase/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Synced to Supabase Cloud successfully!');
        await Promise.all([loadProducts(), loadQuotations(), loadSettings(), checkSupabaseStatus()]);
      } else {
        showToast(data.error || 'Sync failed. Please execute supabase_schema.sql first.', false);
        await checkSupabaseStatus();
      }
    } catch (e) {
      showToast('Error syncing to Supabase: ' + e.message, false);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setAppSettings(await res.json());
    } catch (e) {}
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products?all=true&format=array');
      if (res.ok) {
        const prods = await res.json();
        if (Array.isArray(prods)) {
          setAllProducts(prods);
        } else if (prods.products) {
          setAllProducts(prods.products);
        }
      }
    } catch (e) {}
  };

  // Debounce search query so typing sends fewer requests to Supabase
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch directly from database: pageToFetch defaults to 1, append defaults to false
  const fetchProductsFromDB = async (pageToFetch = 1, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsDbLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (activeCategory && activeCategory !== 'All') params.set('category', activeCategory);
      if (selectedShops.length > 0) params.set('shops', selectedShops.join(','));
      else params.set('shops', 'none');
      if (maxPrice < 600000) params.set('maxPrice', String(maxPrice));
      params.set('sort', sortOrder);
      params.set('page', String(pageToFetch));
      params.set('limit', String(itemsPerPage));

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const incoming = Array.isArray(data) ? data : (data.products || []);
        const total = Array.isArray(data) ? data.length : (data.totalCount || 0);
        const pages = Array.isArray(data) ? Math.max(1, Math.ceil(data.length / itemsPerPage)) : (data.totalPages || 1);

        setTotalDbCount(total);
        setTotalDbPages(pages);
        setCurrentPage(pageToFetch);

        if (append) {
          setDbProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const freshItems = incoming.filter(p => !existingIds.has(p.id));
            return [...prev, ...freshItems];
          });
        } else {
          setDbProducts(incoming);
        }
      }
    } catch (e) {
      console.error('Error fetching products from database:', e);
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsDbLoading(false);
      }
    }
  };

  // Reset to page 1 and fetch fresh data whenever search or filters change
  useEffect(() => {
    fetchProductsFromDB(1, false);
  }, [debouncedSearch, activeCategory, selectedShops, maxPrice, sortOrder]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          if (!isDbLoading && !isLoadingMore && dbProducts.length < totalDbCount && currentPage < totalDbPages) {
            fetchProductsFromDB(currentPage + 1, true);
          }
        }
      },
      {
        root: null,
        rootMargin: '300px',
        threshold: 0.05
      }
    );

    observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [observerTarget.current, isDbLoading, isLoadingMore, dbProducts.length, totalDbCount, currentPage, totalDbPages, debouncedSearch, activeCategory, selectedShops, maxPrice, sortOrder]);

  const toggleShop = (shopKey) => {
    setSelectedShops(prev => {
      const next = prev.includes(shopKey)
        ? prev.filter(s => s !== shopKey)
        : [...prev, shopKey];
      return next;
    });
    setCurrentPage(1);
  };

  const loadQuotations = async () => {
    try {
      const res = await fetch('/api/quotations');
      if (res.ok) setPastQuotations(await res.json());
    } catch (e) {}
  };

  // Local saving cut off - data is fetched directly from database
  const saveCartLocally = () => {};

  // Admin Unlock & Lock Handlers (Protected with master password "Kalana1812@")
  const handleAdminUnlock = async (e) => {
    if (e) e.preventDefault();
    if (!adminPasswordInput) return;
    setIsAdminAuthenticating(true);
    setAdminPasswordError('');

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPasswordInput })
      });
      const data = await res.json();
      if (res.ok && data.authorized) {
        setIsAdminUnlocked(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pantrylk_admin_auth', 'true');
        }
        setAdminPasswordInput('');
        setAdminPasswordError('');
        showToast('Admin interface unlocked!');
      } else {
        setAdminPasswordError('Incorrect password. Access denied.');
        showToast('Incorrect administrator password', false);
      }
    } catch (err) {
      if (adminPasswordInput === 'Kalana1812@') {
        setIsAdminUnlocked(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pantrylk_admin_auth', 'true');
        }
        setAdminPasswordInput('');
        setAdminPasswordError('');
        showToast('Admin interface unlocked!');
      } else {
        setAdminPasswordError('Incorrect password. Access denied.');
        showToast('Incorrect administrator password', false);
      }
    } finally {
      setIsAdminAuthenticating(false);
    }
  };

  const handleAdminLock = () => {
    setIsAdminUnlocked(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pantrylk_admin_auth');
    }
    showToast('Admin interface locked.');
  };

  // Shop Helper
  const getProductShop = (p) => {
    if (p.shop) return p.shop;
    if (p.catalog === 'Polimise' || p.id?.startsWith('polimise_')) return 'Polimise';
    if (p.catalog === 'MM Noorbhoy' || p.id?.startsWith('noorbhoy_')) return 'MM Noorbhoy';
    return 'PDS';
  };

  const getShopBadge = (shop) => {
    if (shop === 'Polimise') {
      return (
        <span className="text-[11px] bg-[#EEF2F7] text-[#1F3A5A] border border-[#C3CFDD] font-bold px-1.5 py-0.5 rounded-md shrink-0">
          Polimise
        </span>
      );
    }
    if (shop === 'MM Noorbhoy') {
      return (
        <span className="text-[11px] bg-[#F0EEEA] text-[#3A4452] border border-[#DAD5CB] font-bold px-1.5 py-0.5 rounded-md shrink-0">
          MM Noorbhoy
        </span>
      );
    }
    return (
      <span className="text-[11px] bg-[#F7F1E6] text-[#7A602F] border border-[#E8DCC2] font-bold px-1.5 py-0.5 rounded-md shrink-0">
        PDS LK
      </span>
    );
  };

  // Shop Counts Map
  const shopCounts = useMemo(() => {
    const counts = { All: allProducts.length, PDS: 0, Polimise: 0, 'MM Noorbhoy': 0 };
    allProducts.forEach(p => {
      const s = getProductShop(p);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allProducts]);

  // Categories Map (computed dynamically for the currently selected shops)
  const categoriesMap = useMemo(() => {
    const map = {};
    allProducts.forEach(p => {
      const s = getProductShop(p);
      const shopMatches = selectedShops.length === 0 || selectedShops.includes(s);
      if (shopMatches) {
        map[p.category] = (map[p.category] || 0) + 1;
      }
    });
    return map;
  }, [allProducts, selectedShops]);

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
    const iconClass = `w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isAct ? 'text-[#D9C9A6]' : ''}`;
    if (cat === 'Boards & Panels' || cat.includes('Boards') || cat.includes('AGT') || cat.includes('HeveaBoard') || cat.includes('HMR')) {
      return <Box className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    if (cat === 'Edge Banding' || cat.includes('Edge Band')) {
      return <Layers className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    if (cat === 'Solid Surfaces & Wall Panels' || cat.includes('Solid') || cat.includes('Wall Panels') || cat.includes('HI-MACS')) {
      return <Sparkles className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    if (cat === 'Kitchen Pullouts & Storage Racks' || cat.includes('Pullout') || cat.includes('Storage Racks') || cat.includes('Kitchen Tall')) {
      return <Building2 className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    if (cat === 'Cutlery Trays & Waste Bins' || cat.includes('Cutlery') || cat.includes('Waste Bins') || cat.includes('Dustbins')) {
      return <ShoppingBag className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    if (cat === 'Sinks & Mixer Taps' || cat.includes('Sink') || cat.includes('Taps') || cat.includes('SCHOCK')) {
      return <Droplets className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    if (cat === 'Wardrobe Accessories' || cat.includes('Wardrobe')) {
      return <Sliders className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    if (cat === 'Hardware, Hinges & Drawer Systems' || cat.includes('Hardware') || cat.includes('Hinges') || cat.includes('Drawer Systems')) {
      return <Wrench className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    if (cat === 'Aluminium Profiles & Handles' || cat.includes('Aluminium') || cat.includes('Handles')) {
      return <Grid className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    if (cat === 'LED Lighting & Electrical' || cat.includes('Lighting')) {
      return <Lightbulb className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    if (cat === 'Kitchen Appliances' || cat.includes('Appliances') || cat.includes('VESTEL')) {
      return <Flame className={`${iconClass} ${!isAct ? 'text-[#7A602F]' : ''}`} />;
    }
    return <Layers className={iconClass} />;
  };

  const totalCartCount = currentQuote.items.reduce((s, i) => s + i.quantity, 0);

  // Common Quote Calculator View (Used in Desktop Sidebar and Mobile Bottom Sheet)
  const renderQuoteCalculatorContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#14263D] text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 sm:p-2 bg-[#B8975A]/20 text-[#CDB27E] rounded-lg border border-[#B8975A]/30">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base tracking-tight">Active Quotation</h2>
            <p className="text-[11px] sm:text-[12px] text-slate-300">Live Itemized Calculator</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <button onClick={clearQuote} className="text-xs text-slate-300 hover:text-rose-400 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-[#1F3A5A] transition">
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[12px]">Clear</span>
          </button>
          {isMobile && (
            <button onClick={() => setIsMobileDrawerOpen(false)} className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-[#1F3A5A]">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 min-h-[160px] max-h-[300px] sm:max-h-[340px] divide-y divide-[#EFEBE2]">
        {currentQuote.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 px-4 text-slate-400 space-y-2">
            <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300" />
            <p className="text-xs sm:text-sm font-semibold text-slate-600">No components selected yet</p>
            <p className="text-[12px] text-slate-400 max-w-[220px]">Select items from the catalog to see rate multiplication live.</p>
          </div>
        ) : (
          currentQuote.items.map(item => (
            <div key={item.id} className="pt-2 flex items-center justify-between space-x-2">
              <div className="w-10 h-10 rounded-lg bg-[#F0EDE6] overflow-hidden shrink-0 border border-[#E4E0D6] flex items-center justify-center p-0.5">
                <img
                  src={resolveProductImage(item.image)}
                  className="max-h-full max-w-full object-contain"
                  alt={item.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/placeholder.svg';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xs text-[#14263D] tabular-nums">{item.articleNo}</span>
                  <span className="text-[11px] text-slate-500 truncate block">{item.name}</span>
                </div>
                <div className="text-[12px] text-slate-500 tabular-nums">
                  {formatLKR(item.mrp)} × <span className="font-bold text-slate-700">{item.quantity}</span> {item.unit}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-[#14263D] tabular-nums">
                  {formatLKR(item.quantity * item.mrp)}
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <button onClick={() => updateItemQty(item.id, -1)} className="w-8 h-8 rounded-lg bg-[#F0EDE6] hover:bg-slate-200 text-xs flex items-center justify-center font-bold touch-manipulation">-</button>
                  <span className="text-xs tabular-nums font-bold px-1">{item.quantity}</span>
                  <button onClick={() => updateItemQty(item.id, 1)} className="w-8 h-8 rounded-lg bg-[#DCE4EE] hover:bg-[#C3CFDD] text-[#14263D] text-xs flex items-center justify-center font-bold touch-manipulation">+</button>
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
      <div className="bg-[#FAF8F3] border-t border-[#E4E0D6] p-3.5 sm:p-4 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Components Subtotal:</span>
          <span className="font-bold text-[#14263D] tabular-nums">{formatLKR(calculations.compTotal)}</span>
        </div>

        {/* Labour & Machinery Input */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-[#E4E0D6]/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Hammer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9C7C43]" />
              <label className="text-[12px] sm:text-xs font-bold text-slate-700">Labour & Machinery Charge</label>
            </div>
            <span className="text-[11px] sm:text-[11px] bg-[#F7F1E6] text-[#7A602F] px-1.5 py-0.5 rounded tabular-nums font-semibold border border-[#E8DCC2]/60">
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
                className="w-full pl-2.5 pr-12 py-1.5 bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8975A] tabular-nums"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">sq.ft</span>
            </div>
            <span className="text-xs font-bold text-[#7A602F] tabular-nums shrink-0">
              {formatLKR(calculations.labourTotal)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
          <span>Subtotal (Items + Labour):</span>
          <span className="font-semibold text-slate-700 tabular-nums">{formatLKR(calculations.preCommTotal)}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-[#14263D] bg-[#EEF2F7]/80 px-2.5 py-1.5 rounded-lg border border-[#C3CFDD]/60">
          <div className="flex items-center space-x-1">
            <Percent className="w-3 h-3 text-[#1F3A5A]" />
            <span className="font-semibold text-[12px] sm:text-xs">Sales Commission ({calculations.commRate}%):</span>
          </div>
          <span className="font-bold text-[#14263D] tabular-nums text-xs">{formatLKR(calculations.commTotal)}</span>
        </div>

        {/* Grand Total */}
        <div className="bg-[#14263D] border-b-2 border-[#B8975A] text-white p-3 rounded-xl shadow-md space-y-0.5">
          <div className="flex items-center justify-between text-[12px] text-[#D9C9A6] font-medium">
            <span>QUOTATION GRAND TOTAL</span>
            <span className="text-[11px] bg-[#B8975A]/30 text-[#C3CFDD] px-1 py-0.2 rounded tabular-nums">LKR</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-slate-300">Net Payable:</span>
            <span className="text-lg sm:text-xl font-black tabular-nums tracking-tight text-[#E6D6B0]">
              {formatLKR(calculations.grandTotal)}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            if (isMobile) setIsMobileDrawerOpen(false);
            setIsQuoteModalOpen(true);
          }}
          className="w-full py-3 sm:py-3.5 bg-[#B8975A] hover:bg-[#C9A96B] active:scale-98 text-[#14263D] font-black rounded-xl text-xs sm:text-sm shadow-md border-0 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 touch-manipulation "
        >
          <FileCheck className="w-5 h-5 text-[#14263D] stroke-[2.5]" />
          <span className="tracking-wider uppercase font-black">Generate Official Quotation</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F4EF] pb-20 lg:pb-0">

      {/* TOP NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#14263D] text-white shadow-lg border-b-[3px] border-[#B8975A] no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Logo & Brand */}
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('maker')}>
              <img
                src="/images/logo.jpg"
                alt="Pantry LK Logo"
                className="h-10 sm:h-11 w-auto object-contain rounded-lg bg-white px-2 py-0.5 shadow-sm shrink-0"
              />
              <div>
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#D9C9A6] hidden sm:block border-l border-white/20 pl-3">Quotation Maker</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => setActiveTab('maker')}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'maker' ? 'bg-[#1F3A5A] text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1F3A5A]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Quotation</span>
                {totalCartCount > 0 && (
                  <span className="bg-white text-[#14263D] text-[11px] sm:text-xs px-1.5 py-0.2 rounded-full font-bold">
                    {totalCartCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                  activeTab === 'history' ? 'bg-[#1F3A5A] text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1F3A5A]'
                }`}
              >
                <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline">Past Quotations</span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                  activeTab === 'admin' ? 'bg-[#1F3A5A] text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1F3A5A]'
                }`}
              >
                {isAdminUnlocked ? (
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D9C9A6]" />
                )}
                <span className="hidden md:inline">Admin</span>
                {!isAdminUnlocked && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CDB27E] hidden xs:inline-block" title="Protected" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* TOAST NOTIFICATION */}
      <div
        className={`fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 transition-all duration-300 flex items-center space-x-2.5 bg-[#14263D] text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl shadow-2xl border border-[#2C4D74] pointer-events-none max-w-[90vw] no-print toast-container ${
          toast.show ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
        }`}
      >
        {toast.isSuccess ? (
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#E6D6B0] shrink-0" />
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
              <div className="bg-white rounded-2xl shadow-sm border border-[#E4E0D6]/80 p-3.5 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                  {/* Search input */}
                  <div className="relative w-full">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search Article No (e.g. 378, 6002), Name, or Keyword..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-10 pr-9 py-2 bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8975A] transition"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Sort dropdown */}
                  <div className="flex items-center space-x-1.5 shrink-0 w-full sm:w-auto justify-end">
                    <span className="text-[12px] text-slate-500 font-medium">Sort:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="bg-[#FAF8F3] border border-[#E4E0D6] text-xs rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#B8975A]"
                    >
                      <option value="default">Default Order</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="name">Name (A-Z)</option>
                      <option value="article">Article No</option>
                    </select>
                  </div>
                </div>

                {/* Shop / Supplier Checkboxes & Price Filter Slider */}
                <div className="pt-1 pb-2 border-b border-[#EFEBE2] space-y-3">
                  
                  {/* Shop Checkboxes */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Store className="w-4 h-4 text-[#1F3A5A]" />
                        <span className="font-extrabold text-xs sm:text-sm text-slate-800 tracking-wide uppercase">Filter by Shop / Supplier</span>
                        <span className="text-[11px] bg-[#F0EDE6] text-slate-600 px-2 py-0.5 rounded-full tabular-nums">
                          {selectedShops.length === 3 ? 'All Suppliers Mode' : `${selectedShops.length} of 3 Selected`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedShops.length === 3) setSelectedShops([]);
                          else setSelectedShops(['PDS', 'Polimise', 'MM Noorbhoy']);
                          setCurrentPage(1);
                        }}
                        className="text-xs text-[#1F3A5A] hover:text-[#14263D] font-semibold transition"
                      >
                        {selectedShops.length === 3 ? 'Clear All' : 'Select All (All Suppliers)'}
                      </button>
                    </div>

                    {/* Responsive Checkbox Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { key: 'PDS', label: 'PDS LK', sub: 'Original Master Catalog', count: shopCounts.PDS },
                        { key: 'Polimise', label: 'Polimise', sub: 'Nuomi Premium Accessories', count: shopCounts.Polimise },
                        { key: 'MM Noorbhoy', label: 'MM Noorbhoy', sub: 'Pantry & Wardrobe Fittings', count: shopCounts['MM Noorbhoy'] },
                      ].map(shop => {
                        const isChecked = selectedShops.includes(shop.key);
                        return (
                          <div
                            key={shop.key}
                            onClick={() => toggleShop(shop.key)}
                            className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 touch-manipulation active:scale-98 ${
                              isChecked
                                ? 'bg-[#14263D] text-white border-[#14263D] shadow-sm ring-1 ring-[#B8975A]'
                                : 'bg-[#FAF8F3] hover:bg-[#F0EDE6]/70 text-slate-600 border-[#E4E0D6]/90'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                                isChecked ? 'bg-[#B8975A] border-[#CDB27E] text-white' : 'bg-white border-slate-300 text-transparent'
                              }`}>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs sm:text-sm truncate">{shop.label}</div>
                                <div className={`text-[11px] truncate ${isChecked ? 'text-slate-300' : 'text-slate-400'}`}>
                                  {shop.sub}
                                </div>
                              </div>
                            </div>
                            <span className={`text-[12px] tabular-nums font-bold px-2 py-0.5 rounded-full shrink-0 ml-1.5 ${
                              isChecked ? 'bg-[#B8975A]/30 text-[#C3CFDD]' : 'bg-white border border-[#E4E0D6] text-slate-600'
                            }`}>
                              {shop.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price Filter Slider */}
                  <div className="bg-[#FAF8F3]/80 rounded-xl p-3 border border-[#E4E0D6]/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sliders className="w-3.5 h-3.5 text-[#1F3A5A]" />
                        <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Price Filter (Max MRP)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs tabular-nums font-bold text-[#1F3A5A] bg-[#EEF2F7] border border-[#C3CFDD] px-2 py-0.5 rounded-md">
                          {maxPrice >= 600000 ? 'All Prices (No Limit)' : `Up to ${formatLKR(maxPrice)}`}
                        </span>
                        {maxPrice < 600000 && (
                          <button
                            type="button"
                            onClick={() => { setMaxPrice(600000); setCurrentPage(1); }}
                            className="text-[12px] text-slate-500 hover:text-[#1F3A5A] font-medium underline"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Interactive Slider Track */}
                    <div className="flex items-center space-x-3 pt-0.5">
                      <span className="text-[11px] tabular-nums text-slate-400 shrink-0">Rs. 0</span>
                      <input
                        type="range"
                        min="1000"
                        max="600000"
                        step="5000"
                        value={maxPrice}
                        onChange={(e) => {
                          setMaxPrice(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1F3A5A] focus:outline-none"
                      />
                      <span className="text-[11px] tabular-nums text-slate-400 shrink-0">Rs. 600K+</span>
                    </div>

                    {/* Quick Price Preset Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Presets:</span>
                      {[
                        { label: 'All Prices', val: 600000 },
                        { label: '< Rs. 10K', val: 10000 },
                        { label: '< Rs. 50K', val: 50000 },
                        { label: '< Rs. 100K', val: 100000 },
                        { label: '< Rs. 250K', val: 250000 },
                      ].map(chip => (
                        <button
                          key={chip.val}
                          type="button"
                          onClick={() => { setMaxPrice(chip.val); setCurrentPage(1); }}
                          className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-medium transition ${
                            maxPrice === chip.val
                              ? 'bg-[#1F3A5A] text-white border-[#1F3A5A] shadow-2xs'
                              : 'bg-white text-slate-600 border-[#E4E0D6] hover:border-[#D9C9A6]'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Large Category Selection Grid / Flow */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-800 tracking-wide uppercase">Select Category</span>
                      <span className="text-[12px] text-[#1F3A5A] font-bold bg-[#EEF2F7] px-2.5 py-0.5 rounded-full border border-[#C3CFDD]/60 tabular-nums">
                        {totalDbCount} items found in database
                      </span>
                      {isDbLoading && (
                        <span className="flex items-center space-x-1 text-[12px] text-[#1F3A5A] font-semibold animate-pulse ml-2">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span className="hidden sm:inline">Searching Database...</span>
                        </span>
                      )}
                    </div>
                    {activeCategory !== 'All' && (
                      <button
                        onClick={() => { setActiveCategory('All'); setCurrentPage(1); }}
                        className="text-xs text-[#1F3A5A] hover:text-[#14263D] font-semibold flex items-center space-x-1 transition"
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
                          ? 'bg-[#14263D] text-white ring-2 ring-[#B8975A] shadow-md shadow-[#14263D]/20'
                          : 'bg-white hover:bg-[#FAF8F3] text-slate-700 border border-[#E4E0D6]/90 hover:border-[#CDB27E]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                        <div className={`p-1.5 rounded-lg shrink-0 ${activeCategory === 'All' ? 'bg-[#B8975A]/20 text-[#D9C9A6]' : 'bg-[#F0EDE6] text-slate-600'}`}>
                          <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="truncate">All Categories</span>
                      </div>
                      <span className={`ml-2 text-[12px] tabular-nums px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        activeCategory === 'All' ? 'bg-[#B8975A]/30 text-[#C3CFDD]' : 'bg-[#F0EDE6] text-slate-600'
                      }`}>
                        {selectedShops.length === 3 ? allProducts.length : selectedShops.reduce((sum, s) => sum + (shopCounts[s] || 0), 0)}
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
                              ? 'bg-[#14263D] text-white ring-2 ring-[#B8975A] shadow-md shadow-[#14263D]/20'
                              : 'bg-white hover:bg-[#FAF8F3] text-slate-700 border border-[#E4E0D6]/90 hover:border-[#CDB27E]'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isAct ? 'bg-[#B8975A]/20 text-[#D9C9A6]' : 'bg-[#F0EDE6] text-slate-600'}`}>
                              {getCategoryIcon(cat, isAct)}
                            </div>
                            <span className="truncate" title={cat}>{cat}</span>
                          </div>
                          <span className={`ml-2 text-[12px] tabular-nums px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            isAct ? 'bg-[#B8975A]/30 text-[#C3CFDD]' : 'bg-[#F0EDE6] text-slate-600'
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 relative min-h-[220px]">
                {isDbLoading && dbProducts.length === 0 ? (
                  <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-[#E4E0D6] shadow-2xs">
                    <RefreshCw className="w-8 h-8 text-[#1F3A5A] animate-spin mx-auto mb-2.5" />
                    <h4 className="font-bold text-slate-800 text-sm">Searching Supabase Database...</h4>
                    <p className="text-xs text-slate-400 mt-1">Retrieving live catalog items</p>
                  </div>
                ) : dbProducts.length === 0 ? (
                  <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-[#E4E0D6]">
                    <PackageSearch className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-700 text-sm">No matching components found in database</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Try adjusting your search keyword, price slider, or selecting additional suppliers.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('All');
                        setSelectedShops(['PDS', 'Polimise', 'MM Noorbhoy']);
                        setMaxPrice(600000);
                        setCurrentPage(1);
                      }}
                      className="mt-3 px-4 py-2 bg-[#1F3A5A] text-white rounded-xl text-xs font-semibold hover:bg-[#1F3A5A] transition shadow-2xs"
                    >
                      Reset All Filters & View All
                    </button>
                  </div>
                ) : (
                  dbProducts.map(p => {
                    const inCart = currentQuote.items.find(i => i.id === p.id);
                    const qty = inCart ? inCart.quantity : 0;
                    return (
                      <div
                        key={p.id}
                        className={`product-card bg-white rounded-2xl p-3.5 flex flex-col justify-between relative group ${
                          qty > 0 ? 'ring-2 ring-[#B8975A] bg-[#EEF2F7]/20' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="badge-tag bg-[#F0EDE6] text-slate-700 tabular-nums font-bold text-[12px] shrink-0">{p.articleNo}</span>
                              {getShopBadge(getProductShop(p))}
                            </div>
                            <span className="text-[11px] bg-[#F0EDE6] text-slate-600 px-2 py-0.5 rounded-full font-medium truncate max-w-[130px]" title={p.category}>
                              {p.category}
                            </span>
                          </div>

                          <div className="w-full h-32 sm:h-36 bg-[#FAF8F3] rounded-xl overflow-hidden mb-2.5 border border-[#EFEBE2] flex items-center justify-center relative p-2">
                            <img
                              src={resolveProductImage(p.image)}
                              alt={p.name}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/images/placeholder.svg';
                              }}
                              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                            {qty > 0 && (
                              <span className="absolute top-2 right-2 bg-[#1F3A5A] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                In Quote ({qty})
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-xs text-[#14263D] leading-snug line-clamp-2" title={p.name}>
                            {p.name}
                          </h4>
                          <p className="text-[11px] sm:text-[12px] text-slate-500 mt-0.5 line-clamp-2" title={p.description}>
                            {p.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#EFEBE2] space-y-2">
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline space-x-1">
                              <span className="text-sm font-extrabold text-[#14263D] tabular-nums">{formatLKR(p.mrp)}</span>
                              <span className="text-[11px] text-slate-400 font-medium">/ {p.unit}</span>
                            </div>
                            {p.perSqfRate && (
                              <span className="text-[11px] text-[#1F3A5A] tabular-nums">Rs. {p.perSqfRate}/sqf</span>
                            )}
                          </div>

                          {qty > 0 ? (
                            <div className="flex items-center justify-between bg-[#EEF2F7] border border-[#C3CFDD] rounded-xl p-1">
                              <button onClick={() => updateItemQty(p.id, -1)} className="w-9 h-9 rounded-lg bg-white text-[#14263D] hover:bg-[#DCE4EE] flex items-center justify-center font-bold text-sm touch-manipulation">
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) => setItemQty(p.id, e.target.value)}
                                className="w-12 text-center text-xs font-bold tabular-nums bg-transparent border-0 focus:outline-none"
                              />
                              <button onClick={() => updateItemQty(p.id, 1)} className="w-9 h-9 rounded-lg bg-[#1F3A5A] text-white hover:bg-[#1F3A5A] flex items-center justify-center font-bold text-sm touch-manipulation">
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addItemToQuote(p, 1)}
                              className="w-full py-2.5 px-3 bg-[#1F3A5A] hover:bg-[#2C4D74] active:scale-98 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center justify-center space-x-1 touch-manipulation"
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

              {/* Infinite Scroll Sentinel & Status */}
              <div ref={observerTarget} className="py-6 flex flex-col items-center justify-center text-center">
                {isLoadingMore && (
                  <div className="flex items-center space-x-2 text-[#1F3A5A] font-medium text-xs py-2 px-4 rounded-full bg-[#EEF2F7] border border-[#C3CFDD] shadow-xs animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading more components... ({dbProducts.length} of {totalDbCount})</span>
                  </div>
                )}
                {!isLoadingMore && dbProducts.length > 0 && dbProducts.length < totalDbCount && (
                  <button
                    type="button"
                    onClick={() => fetchProductsFromDB(currentPage + 1, true)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl shadow-xs transition touch-manipulation"
                  >
                    Load more components ({totalDbCount - dbProducts.length} remaining)
                  </button>
                )}
                {!isDbLoading && !isLoadingMore && dbProducts.length >= totalDbCount && totalDbCount > 0 && (
                  <div className="text-[12px] text-slate-400 font-medium flex items-center space-x-1.5 py-2">
                    <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                    <span>All {totalDbCount} components loaded from database</span>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Right Sidebar: Quotation Calculator */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-4 quote-sidebar bg-white rounded-2xl shadow-sm border border-[#E4E0D6]/80 flex flex-col overflow-hidden">
              {renderQuoteCalculatorContent(false)}
            </div>

          </div>
        )}

        {/* TAB 2: PAST QUOTATIONS */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E4E0D6] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#EFEBE2] pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#14263D]">Saved Quotations & Job History</h2>
                <p className="text-xs text-slate-500">View, reload, or share previous client quotations.</p>
              </div>
              <button onClick={loadQuotations} className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold bg-[#F0EDE6] hover:bg-slate-200 rounded-xl text-slate-700 flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-left text-xs sm:text-sm min-w-[550px]">
                <thead className="bg-[#FAF8F3] text-slate-500 text-[12px] uppercase font-semibold border-b border-[#E4E0D6]">
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
                <tbody className="divide-y divide-[#EFEBE2] text-slate-700">
                  {pastQuotations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                        No saved quotations in history yet.
                      </td>
                    </tr>
                  ) : (
                    pastQuotations.map(q => (
                      <tr key={q.id} className="hover:bg-[#FAF8F3] transition">
                        <td className="py-2.5 px-3 tabular-nums font-bold text-[#14263D] text-xs">{q.jobNo}</td>
                        <td className="py-2.5 px-3 text-[12px]">{q.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#14263D] text-xs">{q.customerName}</td>
                        <td className="py-2.5 px-3 text-[12px] tabular-nums text-slate-500">{q.customerPhone || '-'}</td>
                        <td className="py-2.5 px-2 text-center tabular-nums font-bold text-xs">{q.items ? q.items.length : 0}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[#1F3A5A] text-xs">{formatLKR(q.grandTotal)}</td>
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
                              className="p-1 rounded-lg bg-[#EEF2F7] text-[#1F3A5A] hover:bg-[#DCE4EE]"
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

        {/* TAB 3: ADMIN DASHBOARD (LOCKED) */}
        {activeTab === 'admin' && !isAdminUnlocked && (
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E0D6] shadow-xl text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#14263D] text-[#D9C9A6] flex items-center justify-center shadow-lg shadow-[#14263D]/20">
              <Lock className="w-8 h-8 text-[#D9C9A6]" />
            </div>

            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F7F1E6] text-[#7A602F] border border-[#E8DCC2] mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#9C7C43]" />
                <span>Restricted Access</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#14263D] tracking-tight">Admin Authorization</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                The administrator panel is protected. Please enter the master password to manage catalog products, formulas, and database configuration.
              </p>
            </div>

            <form onSubmit={handleAdminUnlock} className="space-y-4">
              <div className="text-left">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Master Password
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (adminPasswordError) setAdminPasswordError('');
                    }}
                    placeholder="Enter admin password..."
                    autoFocus
                    className={`w-full px-4 py-3 pr-11 text-sm bg-[#FAF8F3] border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition ${
                      adminPasswordError
                        ? 'border-rose-400 focus:ring-rose-400/30 text-rose-900'
                        : 'border-slate-300 focus:border-[#B8975A] focus:ring-[#B8975A]/20 text-slate-800'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showAdminPassword ? "Hide password" : "Show password"}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {adminPasswordError && (
                  <p className="text-xs font-semibold text-rose-500 mt-2 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{adminPasswordError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isAdminAuthenticating || !adminPasswordInput.trim()}
                className="w-full py-3 bg-[#1F3A5A] hover:bg-[#2C4D74] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-[#1F3A5A]/20 transition flex items-center justify-center space-x-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isAdminAuthenticating ? 'Authenticating...' : 'Unlock Admin Dashboard'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('maker')}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-[#F0EDE6] rounded-xl transition"
              >
                Back to Quotation Maker
              </button>
            </form>

            <div className="pt-3 border-t border-[#EFEBE2] flex items-center justify-center space-x-1.5 text-[12px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1F3A5A]" />
              <span>Pantry LK Administrative Security</span>
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN DASHBOARD (UNLOCKED) */}
        {activeTab === 'admin' && isAdminUnlocked && (
          <div className="space-y-5">
            <div className="bg-[#14263D] text-white rounded-2xl p-4 sm:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-[#CDB27E]" />
                  <h2 className="text-base sm:text-xl font-bold">Admin Management Center</h2>
                </div>
                <p className="text-[12px] sm:text-xs text-slate-300 mt-0.5">Configure formula rates, catalog components, and quotation terms.</p>
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
                  className="flex-1 sm:flex-initial px-3 py-2 bg-[#B8975A] hover:bg-[#2C4D74] text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center space-x-1.5"
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
                <button
                  onClick={handleAdminLock}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-[#1F3A5A] hover:bg-[#2C4D74] text-[#D9C9A6] hover:text-white text-xs font-semibold rounded-xl border border-[#2C4D74] transition flex items-center justify-center space-x-1.5 shadow-sm"
                  title="Lock admin interface"
                >
                  <Lock className="w-3.5 h-3.5 text-[#CDB27E]" />
                  <span>Lock</span>
                </button>
              </div>
            </div>

            {/* Supabase Cloud Database Management Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E0D6] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFEBE2] pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EEF2F7] border border-[#C3CFDD] flex items-center justify-center text-[#1F3A5A]">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm sm:text-base text-[#14263D]">Supabase Cloud Database</h3>
                      {supabaseStatus.loading ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0EDE6] text-slate-600 animate-pulse">
                          Checking...
                        </span>
                      ) : supabaseStatus.tables?.products?.ready ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EEF2F7] text-[#1F3A5A] border border-[#C3CFDD] flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#177A42] animate-ping mr-1"></span>
                          <span>Cloud Active</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F7F1E6] text-[#7A602F] border border-[#E8DCC2] flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-[#B8975A]" />
                          <span>Tables Setup Needed</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-500 tabular-nums mt-0.5">
                      https://dngdvqkvhtabpfskmhan.supabase.co
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={syncToSupabase}
                    disabled={isSyncingSupabase}
                    className="px-3 py-1.5 bg-[#1F3A5A] hover:bg-[#2C4D74] disabled:opacity-60 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-bounce' : ''}`} />
                    <span>{isSyncingSupabase ? 'Syncing...' : 'Re-sync Initial Catalog'}</span>
                  </button>
                  <button
                    onClick={checkSupabaseStatus}
                    title="Refresh connection status"
                    className="p-1.5 border border-[#E4E0D6] hover:bg-[#FAF8F3] text-slate-600 rounded-xl transition"
                  >
                    <RefreshCw className={`w-4 h-4 ${supabaseStatus.loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsSqlModalOpen(true)}
                    className="px-2.5 py-1.5 bg-[#1F3A5A] hover:bg-[#2C4D74] text-white rounded-xl text-xs font-medium transition flex items-center space-x-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>SQL Schema</span>
                  </button>
                </div>
              </div>

              {/* Status Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-medium text-slate-500">Products Catalog</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {supabaseStatus.tables?.products?.ready
                        ? `${supabaseStatus.tables.products.count} Items Synced`
                        : 'Table uninitialized'}
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${supabaseStatus.tables?.products?.ready ? 'bg-[#177A42]' : 'bg-[#CDB27E]'}`} />
                </div>

                <div className="p-3 bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-medium text-slate-500">Quotations Archive</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {supabaseStatus.tables?.quotations?.ready
                        ? `${supabaseStatus.tables.quotations.count} Saved Quotes`
                        : 'Table uninitialized'}
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${supabaseStatus.tables?.quotations?.ready ? 'bg-[#177A42]' : 'bg-[#CDB27E]'}`} />
                </div>

                <div className="p-3 bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-medium text-slate-500">Formula & Settings</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {supabaseStatus.tables?.settings?.ready
                        ? 'Configured in Cloud'
                        : 'Table uninitialized'}
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${supabaseStatus.tables?.settings?.ready ? 'bg-[#177A42]' : 'bg-[#CDB27E]'}`} />
                </div>
              </div>

              {!supabaseStatus.tables?.products?.ready && (
                <div className="p-3 bg-[#F7F1E6] border border-[#E8DCC2] rounded-xl text-[#5E4A24] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-[#9C7C43] shrink-0" />
                    <span>Supabase tables are not yet created in your cloud project. Run the SQL schema once in your Supabase SQL Editor.</span>
                  </div>
                  <button
                    onClick={() => setIsSqlModalOpen(true)}
                    className="px-3 py-1 bg-[#9C7C43] hover:bg-[#B8975A] text-white font-bold rounded-lg text-[12px] shrink-0"
                  >
                    Open SQL Setup
                  </button>
                </div>
              )}
            </div>

            {/* Formula & Company Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E0D6] shadow-sm space-y-3">
                <div className="flex items-center space-x-2 border-b border-[#EFEBE2] pb-2.5">
                  <Sliders className="w-4 h-4 text-[#1F3A5A]" />
                  <h3 className="font-bold text-xs sm:text-sm text-[#14263D]">Charge Formula Settings</h3>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[12px] sm:text-xs font-semibold text-slate-700 mb-1">Labour & Machinery Charge (LKR / Sq.Ft)</label>
                    <input
                      type="number"
                      value={appSettings.labourRatePerSqFt}
                      onChange={(e) => setAppSettings(s => ({ ...s, labourRatePerSqFt: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2 border border-[#E4E0D6] rounded-xl text-xs sm:text-sm font-semibold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] sm:text-xs font-semibold text-slate-700 mb-1">Sales Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={appSettings.salesCommissionRate}
                      onChange={(e) => setAppSettings(s => ({ ...s, salesCommissionRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2 border border-[#E4E0D6] rounded-xl text-xs sm:text-sm font-semibold tabular-nums"
                    />
                  </div>
                  <button onClick={saveFormulaRates} className="w-full py-2 bg-[#14263D] hover:bg-[#1F3A5A] text-white rounded-xl text-xs font-bold transition">
                    Save Formula Rates
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E0D6] shadow-sm space-y-3">
                <div className="flex items-center space-x-2 border-b border-[#EFEBE2] pb-2.5">
                  <Building2 className="w-4 h-4 text-[#1F3A5A]" />
                  <h3 className="font-bold text-xs sm:text-sm text-[#14263D]">Company Information</h3>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center space-x-3 p-2.5 bg-[#FAF8F3] border border-[#E4E0D6] rounded-xl">
                    <img
                      src="/images/logo.jpg"
                      alt="Current Company Logo"
                      className="w-12 h-10 object-contain rounded bg-white p-1 border border-[#E4E0D6] shadow-xs"
                    />
                    <div>
                      <div className="font-bold text-slate-800 text-[12px]">Official Company Logo</div>
                      <div className="text-[11px] text-slate-500">public/images/logo.jpg (Active on Quotation Views)</div>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[12px]">Company Name</label>
                    <input
                      type="text"
                      value={appSettings.companyName}
                      onChange={(e) => setAppSettings(s => ({ ...s, companyName: e.target.value }))}
                      className="w-full p-1.5 sm:p-2 border border-[#E4E0D6] rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[12px]">Phone</label>
                      <input
                        type="text"
                        value={appSettings.companyPhone}
                        onChange={(e) => setAppSettings(s => ({ ...s, companyPhone: e.target.value }))}
                        className="w-full p-1.5 sm:p-2 border border-[#E4E0D6] rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[12px]">Email</label>
                      <input
                        type="text"
                        value={appSettings.companyEmail}
                        onChange={(e) => setAppSettings(s => ({ ...s, companyEmail: e.target.value }))}
                        className="w-full p-1.5 sm:p-2 border border-[#E4E0D6] rounded-xl"
                      />
                    </div>
                  </div>
                  <button onClick={saveCompanyInfo} className="w-full py-2 bg-[#14263D] hover:bg-[#1F3A5A] text-white rounded-xl text-xs font-bold transition">
                    Save Company Info
                  </button>
                </div>
              </div>

            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E0D6] shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#EFEBE2] pb-2.5">
                <h3 className="font-bold text-xs sm:text-sm text-[#14263D]">Component Catalog Inventory ({allProducts.length} items)</h3>
                <div className="w-full sm:w-72 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter inventory..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-[#E4E0D6] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[460px] overflow-y-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-[#FAF8F3] text-slate-500 uppercase font-semibold sticky top-0 border-b border-[#E4E0D6] z-10 text-[11px]">
                    <tr>
                      <th className="py-2 px-2.5">Photo</th>
                      <th className="py-2 px-2.5">Code</th>
                      <th className="py-2 px-2.5">Supplier</th>
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-2.5">Description</th>
                      <th className="py-2 px-2">Unit</th>
                      <th className="py-2 px-2.5 text-right">MRP (Rs.)</th>
                      <th className="py-2 px-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEBE2]">
                    {allProducts
                      .filter(p => !adminSearch || p.articleNo?.toLowerCase().includes(adminSearch.toLowerCase()) || p.name?.toLowerCase().includes(adminSearch.toLowerCase()))
                      .slice(0, 100)
                      .map(p => (
                        <tr key={p.id} className="hover:bg-[#FAF8F3] transition">
                          <td className="py-1.5 px-2.5">
                            <img
                              src={resolveProductImage(p.image)}
                              className="w-7 h-7 object-contain rounded border border-[#E4E0D6]"
                              alt={p.name}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/images/placeholder.svg';
                              }}
                            />
                          </td>
                          <td className="py-1.5 px-2.5 tabular-nums font-bold text-[#14263D] text-[12px]">{p.articleNo}</td>
                          <td className="py-1.5 px-2.5">{getShopBadge(getProductShop(p))}</td>
                          <td className="py-1.5 px-2.5 text-slate-500 text-[12px] truncate max-w-[120px]">{p.category}</td>
                          <td className="py-1.5 px-2.5">
                            <div className="font-semibold text-slate-800 line-clamp-1 text-[12px]">{p.name}</div>
                          </td>
                          <td className="py-1.5 px-2 tabular-nums text-slate-500 text-[12px]">{p.unit}</td>
                          <td className="py-1.5 px-2.5 text-right tabular-nums font-bold text-[#14263D] text-[12px]">{formatLKR(p.mrp)}</td>
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                                className="p-1 rounded text-[#1F3A5A] hover:bg-[#EEF2F7]"
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#14263D]/95 backdrop-blur-md text-white border-t border-[#2C4D74] px-4 py-2.5 shadow-2xl flex items-center justify-between no-print">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-[#B8975A]/20 text-[#CDB27E] flex items-center justify-center border border-[#B8975A]/30">
              <ShoppingBag className="w-4 h-4" />
            </div>
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {totalCartCount}
              </span>
            )}
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Net Grand Total</div>
            <div className="text-sm font-black tabular-nums text-[#E6D6B0]">{formatLKR(calculations.grandTotal)}</div>
          </div>
        </div>

        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="px-4 py-2 bg-[#B8975A] hover:bg-[#C9A96B] text-[#14263D] text-xs sm:text-sm font-black rounded-xl shadow-md border-0 flex items-center space-x-1.5 transition active:scale-95 touch-manipulation "
        >
          <span>View & Generate ({totalCartCount})</span>
          <ChevronUp className="w-4 h-4 text-[#14263D] stroke-[2.5]" />
        </button>
      </div>

      {/* MOBILE SLIDE-UP DRAWER (Bottom Sheet Modal) */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-[#E4E0D6] max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            {renderQuoteCalculatorContent(true)}
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL QUOTATION VIEW & EXPORT */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs overflow-y-auto p-0 sm:p-4 md:p-6 flex items-center justify-center print-modal-overlay">
          <div className="bg-white w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl shadow-2xl border border-[#E4E0D6] overflow-hidden flex flex-col print-modal-card">
            
            {/* Top Bar */}
            <div className="bg-[#14263D] text-white px-4 py-3 sm:px-6 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 no-print shrink-0">
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
                  <p className="text-[11px] sm:text-[12px] text-slate-400">Pantry LK Pvt Ltd</p>
                </div>
              </div>

              {/* Larger Action Buttons in Top Bar */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  onClick={saveQuotationToHistory}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[#1F3A5A] hover:bg-[#2C4D74] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm border border-[#2C4D74] transition flex items-center space-x-1.5 active:scale-95 touch-manipulation"
                  title="Save quotation to history"
                >
                  <Save className="w-4 h-4 text-[#CDB27E]" />
                  <span>Save</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[#1F3A5A] hover:bg-[#2C4D74] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-95 touch-manipulation"
                  title="Print quotation"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white hover:bg-[#EEF2F7] text-[#1F3A5A] border border-[#1F3A5A] text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-95 touch-manipulation"
                  title="Save / Export as PDF file"
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF File</span>
                </button>

                <button
                  onClick={shareViaWhatsApp}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[#177A42] hover:bg-[#1E8F50] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-95 touch-manipulation"
                  title="Share quotation via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1F3A5A] transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer Inputs */}
            <div className="bg-[#FAF8F3] border-b border-[#E4E0D6] px-4 py-3 sm:px-6 sm:py-3.5 no-print shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1F3A5A]" />
                  <span>Customer & Job Details</span>
                </span>
                <button
                  onClick={saveQuotationToHistory}
                  className="px-3.5 py-1.5 bg-[#DCE4EE] hover:bg-[#C3CFDD] text-[#14263D] border border-[#D9C9A6] font-bold rounded-xl text-xs flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-[#1F3A5A]" />
                  <span>Save to History</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5 text-[12px]">Customer Name *</label>
                  <input
                    type="text"
                    value={currentQuote.customerName}
                    placeholder="e.g. Mr. John Silva"
                    onChange={(e) => setCurrentQuote(q => ({ ...q, customerName: e.target.value }))}
                    className="w-full p-1.5 sm:p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B8975A]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5 text-[12px]">Contact (WhatsApp) *</label>
                  <input
                    type="text"
                    value={currentQuote.customerPhone}
                    placeholder="e.g. 077 123 4567"
                    onChange={(e) => setCurrentQuote(q => ({ ...q, customerPhone: e.target.value }))}
                    className="w-full p-1.5 sm:p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B8975A]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5 text-[12px]">Job / Quotation No *</label>
                  <input
                    type="text"
                    value={currentQuote.jobNo}
                    onChange={(e) => setCurrentQuote(q => ({ ...q, jobNo: e.target.value }))}
                    className="w-full p-1.5 sm:p-2 bg-white border border-slate-300 rounded-lg text-xs tabular-nums font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5 text-[12px]">Customer Address</label>
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
              <div className="border-b-2 border-[#14263D] pb-3 mb-3 sm:pb-4 sm:mb-4 flex flex-row justify-between items-center gap-3">
                <div className="flex items-center space-x-3">
                  <img
                    src="/images/logo.jpg"
                    alt="Pantry LK Pvt Ltd Logo"
                    className="h-12 sm:h-14 w-auto object-contain rounded shrink-0 print:h-11"
                  />
                  <div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <span className="text-lg sm:text-2xl font-black tracking-tight text-[#14263D]">PANTRY LK</span>
                      <span className="bg-[#14263D] text-[#CDB27E] text-[11px] sm:text-xs px-2 py-0.5 rounded font-bold">PVT LTD</span>
                    </div>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-0.5">PREMIUM MODERN KITCHEN & PANTRY SOLUTIONS</p>
                    <p className="text-[11px] sm:text-xs text-slate-500">{appSettings.companyAddress} | Hotline: {appSettings.companyPhone}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block bg-[#14263D] text-white text-[11px] sm:text-xs uppercase font-extrabold px-2.5 py-0.5 rounded tracking-wider mb-1">OFFICIAL QUOTATION</span>
                  <div className="text-[11px] sm:text-xs text-slate-600 space-y-0.5 tabular-nums">
                    <div>Job No: <span className="font-bold text-[#14263D]">{currentQuote.jobNo}</span></div>
                    <div>Date: <span className="font-medium text-slate-800">{currentQuote.date}</span></div>
                    <div>Validity: <span className="font-medium text-slate-800">14 Days</span></div>
                  </div>
                </div>
              </div>

              {/* Customer & Scope Info Box */}
              <div className="bg-[#FAF8F3] rounded-lg p-2.5 sm:p-3 border border-[#E4E0D6] mb-3 grid grid-cols-2 gap-2 text-xs print:p-2 print:mb-2 print:border-slate-300">
                <div>
                  <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Quotation Prepared For</div>
                  <div className="font-bold text-[#14263D] text-xs sm:text-sm mt-0.5 print:text-xs">{currentQuote.customerName || 'Valued Customer'}</div>
                  <div className="text-slate-600 mt-0.5 text-[11px] print:text-[9px]">{currentQuote.customerAddress ? `Address: ${currentQuote.customerAddress}` : 'Address: Not specified'}</div>
                  <div className="text-slate-600 mt-0.5 text-[11px] print:text-[9px]">{currentQuote.customerPhone ? `Contact: ${currentQuote.customerPhone}` : 'Contact: Not specified'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Project Scope</div>
                  <div className="font-semibold text-slate-800 mt-0.5 text-xs print:text-xs">Pantry & Cabinetry Fabrication</div>
                  <div className="text-slate-600 mt-0.5 text-[11px] print:text-[9px]">Machinery & Labour: {currentQuote.sqft} sq.ft</div>
                  <div className="text-[#1F3A5A] font-medium mt-0.5 text-[11px] print:text-[9px]">Sales Commission: {calculations.commRate}% Included</div>
                </div>
              </div>

              {/* Mobile Swipe Notice */}
              <div className="sm:hidden flex items-center space-x-1 text-[11px] text-slate-400 italic mb-1.5 no-print">
                <ArrowRightLeft className="w-3 h-3" />
                <span>Swipe table horizontally to inspect all columns</span>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto mb-3 sm:mb-4 -mx-4 sm:mx-0 px-4 sm:px-0 print:overflow-visible print:mx-0 print:px-0 print:mb-2">
                <table className="w-full text-left text-xs border border-[#E4E0D6] min-w-[560px] quotation-table print:min-w-full print:border-slate-300 print:text-[10px]">
                  <thead className="bg-[#14263D] text-white uppercase text-[11px] sm:text-[12px] font-semibold print:text-[9px]">
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
                  <tbody className="divide-y divide-[#E4E0D6] text-slate-800 text-[12px] print:text-[10px] print:divide-slate-300">
                    {currentQuote.items.map((item, idx) => (
                      <tr key={item.id} className="print:break-inside-avoid">
                        <td className="py-1 px-2 text-center text-slate-500 tabular-nums print:py-0.5">{idx + 1}</td>
                        <td className="py-1 px-1.5 text-center print:py-0.5">
                          <img
                            src={resolveProductImage(item.image)}
                            className="w-7 h-7 object-contain rounded border border-[#E4E0D6] mx-auto quotation-item-img print:w-6 print:h-6"
                            alt={item.name}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/images/placeholder.svg';
                            }}
                          />
                        </td>
                        <td className="py-1 px-2 print:py-0.5">
                          <div className="font-bold text-[#14263D] leading-tight">{item.articleNo}</div>
                          <div className="text-[11px] text-slate-600 line-clamp-1 print:text-[9px]">{item.name}</div>
                          {item.description && <div className="text-[11px] text-slate-400 line-clamp-1 print:text-[8px]">{item.description}</div>}
                        </td>
                        <td className="py-1 px-1.5 text-center text-slate-600 tabular-nums print:py-0.5">{item.unit}</td>
                        <td className="py-1 px-2 text-right tabular-nums print:py-0.5">{formatLKR(item.mrp)}</td>
                        <td className="py-1 px-1.5 text-center tabular-nums font-bold print:py-0.5">{item.quantity}</td>
                        <td className="py-1 px-2 text-right tabular-nums font-bold print:py-0.5">{formatLKR(item.quantity * item.mrp)}</td>
                      </tr>
                    ))}

                    {/* ONLY ONE GRAND TOTAL AT THE VERY END (Inside tbody so it NEVER repeats across page breaks) */}
                    <tr className="border-t-2 border-[#14263D] bg-[#FAF8F3] font-semibold text-[11px] print:text-[9px] print:break-inside-avoid">
                      <td colSpan="6" className="py-1 px-2 text-right text-slate-600 print:py-0.5">Equipment Subtotal:</td>
                      <td className="py-1 px-2.5 text-right tabular-nums font-bold text-[#14263D] print:py-0.5 whitespace-nowrap">{formatLKR(calculations.compTotal)}</td>
                    </tr>
                    <tr className="border-b border-[#E4E0D6] bg-[#FAF8F3] font-semibold text-[11px] print:text-[9px] print:border-slate-300 print:break-inside-avoid">
                      <td colSpan="6" className="py-1 px-2 text-right text-slate-600 print:py-0.5">
                        Labour & Machinery ({currentQuote.sqft} sq.ft @ {formatLKR(calculations.labourRate)}):
                      </td>
                      <td className="py-1 px-2.5 text-right tabular-nums font-bold text-[#7A602F] print:py-0.5 whitespace-nowrap">{formatLKR(calculations.labourTotal)}</td>
                    </tr>
                    <tr className="border-b border-[#E4E0D6] bg-[#F0EDE6]/60 font-semibold text-[11px] print:text-[9px] print:border-slate-300 print:break-inside-avoid">
                      <td colSpan="6" className="py-1 px-2 text-right text-slate-700 print:py-0.5">Subtotal (Materials + Labour):</td>
                      <td className="py-1 px-2.5 text-right tabular-nums font-bold text-[#14263D] print:py-0.5 whitespace-nowrap">{formatLKR(calculations.preCommTotal)}</td>
                    </tr>
                    <tr className="border-b-2 border-[#14263D] bg-[#EEF2F7]/60 font-semibold text-[11px] print:text-[9px] print:border-b-2 print:break-inside-avoid">
                      <td colSpan="6" className="py-1 px-2 text-right text-[#14263D] font-bold print:py-0.5">Sales Commission ({calculations.commRate}%):</td>
                      <td className="py-1 px-2.5 text-right tabular-nums font-bold text-[#14263D] print:py-0.5 whitespace-nowrap">{formatLKR(calculations.commTotal)}</td>
                    </tr>
                    <tr className="bg-[#14263D] text-white font-extrabold text-xs print:text-[11px] print:break-inside-avoid">
                      <td colSpan="6" className="py-1.5 px-2 text-right tracking-wide text-[#D9C9A6] print:py-1">NET GRAND TOTAL:</td>
                      <td className="py-1.5 px-2.5 text-right tabular-nums text-[#E6D6B0] text-xs sm:text-sm print:text-xs print:py-1 whitespace-nowrap">{formatLKR(calculations.grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Amount in Words */}
              <div className="mb-2 p-2 bg-[#FAF8F3] border border-[#E4E0D6] rounded text-[11px] print:text-[9px] print:p-1.5 print:mb-2 print:border-slate-300 print:break-inside-avoid">
                <span className="text-slate-500 font-semibold">Amount in Words: </span>
                <span className="font-bold text-slate-800 uppercase">{numberToWords(calculations.grandTotal)}</span>
              </div>

              {/* Terms & Conditions */}
              <div className="border-t border-[#E4E0D6] pt-2 mb-2.5 text-[11px] text-slate-500 leading-tight print:text-[8px] print:pt-1.5 print:mb-2 print:border-slate-300 print:break-inside-avoid">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-0.5">Terms & Conditions</div>
                <div className="whitespace-pre-line leading-relaxed">{appSettings.termsAndConditions}</div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-2 border-t border-[#E4E0D6] text-xs print:pt-1.5 print:gap-6 print:border-slate-300 print:break-inside-avoid">
                <div className="text-center">
                  <div className="h-8 border-b border-dashed border-slate-400 flex items-end justify-center pb-0.5">
                    <span className="text-slate-400 italic text-[11px]">Pantry LK Pvt Ltd</span>
                  </div>
                  <p className="font-bold text-slate-800 mt-1 text-[11px] print:text-[9px]">Authorized Signature</p>
                  <p className="text-[10px] text-slate-400">Pantry LK Pvt Ltd</p>
                </div>
                <div className="text-center">
                  <div className="h-8 border-b border-dashed border-slate-400 flex items-end justify-center pb-0.5">
                    <span className="text-slate-400 italic text-[11px]">Customer Acceptance</span>
                  </div>
                  <p className="font-bold text-slate-800 mt-1 text-[11px] print:text-[9px]">Customer Acceptance</p>
                  <p className="text-[10px] text-slate-400">Signature & Date</p>
                </div>
              </div>

            </div>

            {/* Bottom Actions with Bit Larger Buttons */}
            <div className="bg-[#F0EDE6] border-t border-[#E4E0D6] px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 no-print shrink-0">
              <span className="text-xs text-slate-500 hidden lg:inline">
                Pantry LK Formal Quotation • Ready to export, print, or share directly
              </span>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-[#FAF8F3] text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition"
                >
                  Back
                </button>

                <button
                  onClick={saveQuotationToHistory}
                  className="px-4 py-2.5 bg-[#1F3A5A] hover:bg-[#2C4D74] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm border border-[#2C4D74] transition flex items-center space-x-1.5 active:scale-95"
                >
                  <Save className="w-4 h-4 text-[#CDB27E]" />
                  <span>Save Quotation</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-[#1F3A5A] hover:bg-[#2C4D74] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white hover:bg-[#EEF2F7] text-[#1F3A5A] border border-[#1F3A5A] text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  <span>Save as PDF</span>
                </button>

                <button
                  onClick={doneAndShare}
                  className="px-5 py-2.5 bg-[#177A42] hover:bg-[#1E8F50] active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition flex items-center space-x-2 touch-manipulation"
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
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#E4E0D6] overflow-hidden space-y-3.5 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFEBE2] pb-2.5">
              <h3 className="font-bold text-sm sm:text-base text-[#14263D]">{editingProduct?.id ? 'Edit Component' : 'Add New Component'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[12px]">Article No / Code *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct?.articleNo || ''}
                    onChange={(e) => setEditingProduct(p => ({ ...p, articleNo: e.target.value }))}
                    className="w-full p-2 border border-[#E4E0D6] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[12px]">Category *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct?.category || ''}
                    onChange={(e) => setEditingProduct(p => ({ ...p, category: e.target.value }))}
                    className="w-full p-2 border border-[#E4E0D6] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5 text-[12px]">Product Title / Name *</label>
                <input
                  type="text"
                  required
                  value={editingProduct?.name || ''}
                  onChange={(e) => setEditingProduct(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2 border border-[#E4E0D6] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5 text-[12px]">Full Description</label>
                <textarea
                  rows="2"
                  value={editingProduct?.description || ''}
                  onChange={(e) => setEditingProduct(p => ({ ...p, description: e.target.value }))}
                  className="w-full p-2 border border-[#E4E0D6] rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[12px]">Unit *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct?.unit || 'No'}
                    onChange={(e) => setEditingProduct(p => ({ ...p, unit: e.target.value }))}
                    className="w-full p-2 border border-[#E4E0D6] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[12px]">MRP Price (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct?.mrp || ''}
                    onChange={(e) => setEditingProduct(p => ({ ...p, mrp: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 border border-[#E4E0D6] rounded-lg tabular-nums font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5 text-[12px]">Image URL / Path</label>
                <input
                  type="text"
                  value={editingProduct?.image || ''}
                  placeholder="images/products/...jpg"
                  onChange={(e) => setEditingProduct(p => ({ ...p, image: e.target.value }))}
                  className="w-full p-2 border border-[#E4E0D6] rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#EFEBE2]">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-3 py-1.5 border border-[#E4E0D6] rounded-lg text-slate-600 font-semibold hover:bg-[#FAF8F3] text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[#1F3A5A] hover:bg-[#2C4D74] text-white rounded-lg font-bold shadow-sm text-xs">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUPABASE SQL SCHEMA SETUP */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#14263D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-[#E4E0D6] space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#EFEBE2] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EEF2F7] border border-[#C3CFDD] flex items-center justify-center text-[#1F3A5A]">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#14263D]">Supabase SQL Schema Setup</h3>
                  <p className="text-[12px] text-slate-500">Run this once in Supabase SQL Editor to initialize tables.</p>
                </div>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="p-1.5 hover:bg-[#F0EDE6] rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#EEF2F7] border border-[#C3CFDD] rounded-xl p-3 text-xs text-[#14263D] space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-[#1F3A5A]" />
                <span>Quick Setup (30 Seconds):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[12px] text-[#14263D] ml-1">
                <li>Click <strong>Copy SQL</strong> below.</li>
                <li>Open your <strong>Supabase Dashboard SQL Editor</strong>.</li>
                <li>Paste the script and click <strong>Run</strong>.</li>
                <li>Return here and click <strong>Sync Local Data to Supabase</strong>!</li>
              </ol>
            </div>

            <div className="relative flex-1 min-h-[220px]">
              <div className="absolute right-2 top-2 z-10 flex items-center space-x-2">
                <button
                  onClick={() => {
                    const sql = `-- Pantry LK Supabase Schema
create table if not exists public.products (
  id text primary key,
  article_no text not null,
  name text not null,
  category text not null,
  mrp numeric not null default 0,
  unit text default 'No',
  description text default '',
  image text default '',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.quotations (
  id text primary key,
  job_no text not null,
  date text not null,
  customer_name text default '',
  customer_phone text default '',
  customer_address text default '',
  sqft numeric default 0,
  comp_total numeric default 0,
  labour_total numeric default 0,
  commission_total numeric default 0,
  grand_total numeric default 0,
  items jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.quotations add column if not exists comp_total numeric default 0;
alter table public.quotations add column if not exists labour_total numeric default 0;
alter table public.quotations add column if not exists commission_total numeric default 0;

create table if not exists public.settings (
  id text primary key default 'default',
  company_name text default 'Pantry LK Pvt Ltd',
  company_tagline text default 'Premium Modern Kitchen & Pantry Solutions',
  company_address text default 'Colombo, Sri Lanka',
  company_phone text default '+94 77 000 0000',
  company_email text default 'sales@pantrylk.com',
  company_web text default 'www.pantrylk.com',
  labour_rate_per_sq_ft numeric default 1800.0,
  sales_commission_rate numeric default 5.0,
  currency text default 'LKR',
  currency_symbol text default 'Rs.',
  terms_and_conditions text default '',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.products enable row level security;
alter table public.quotations enable row level security;
alter table public.settings enable row level security;

create policy "Allow public read products" on public.products for select to anon, authenticated using (true);
create policy "Allow public insert products" on public.products for insert to anon, authenticated with check (true);
create policy "Allow public update products" on public.products for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete products" on public.products for delete to anon, authenticated using (true);

create policy "Allow public read quotations" on public.quotations for select to anon, authenticated using (true);
create policy "Allow public insert quotations" on public.quotations for insert to anon, authenticated with check (true);
create policy "Allow public update quotations" on public.quotations for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete quotations" on public.quotations for delete to anon, authenticated using (true);

create policy "Allow public read settings" on public.settings for select to anon, authenticated using (true);
create policy "Allow public insert settings" on public.settings for insert to anon, authenticated with check (true);
create policy "Allow public update settings" on public.settings for update to anon, authenticated using (true) with check (true);`;

                    navigator.clipboard.writeText(sql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-[#1F3A5A] hover:bg-[#2C4D74] text-white rounded-md text-[12px] font-semibold flex items-center space-x-1 shadow-sm transition"
                >
                  {copiedSql ? <Check className="w-3 h-3 text-[#E6D6B0]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>

              <pre className="w-full h-full max-h-64 overflow-y-auto bg-[#14263D] text-slate-100 p-3.5 rounded-xl tabular-nums text-[12px] leading-relaxed border border-[#2C4D74] select-all">
{`-- 1. Products Table
create table if not exists public.products (
  id text primary key,
  article_no text not null,
  name text not null,
  category text not null,
  mrp numeric not null default 0,
  unit text default 'No',
  description text default '',
  image text default '',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Quotations Table
create table if not exists public.quotations (
  id text primary key,
  job_no text not null,
  date text not null,
  customer_name text default '',
  customer_phone text default '',
  customer_address text default '',
  sqft numeric default 0,
  comp_total numeric default 0,
  labour_total numeric default 0,
  commission_total numeric default 0,
  grand_total numeric default 0,
  items jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Settings Table
create table if not exists public.settings (
  id text primary key default 'default',
  company_name text default 'Pantry LK Pvt Ltd',
  company_tagline text default 'Premium Modern Kitchen & Pantry Solutions',
  company_address text default 'Colombo, Sri Lanka',
  company_phone text default '+94 77 000 0000',
  company_email text default 'sales@pantrylk.com',
  company_web text default 'www.pantrylk.com',
  labour_rate_per_sq_ft numeric default 1800.0,
  sales_commission_rate numeric default 5.0,
  currency text default 'LKR',
  currency_symbol text default 'Rs.',
  terms_and_conditions text default '',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Enable RLS & Add Public Policies
alter table public.products enable row level security;
alter table public.quotations enable row level security;
alter table public.settings enable row level security;

create policy "Allow public read products" on public.products for select to anon, authenticated using (true);
create policy "Allow public insert products" on public.products for insert to anon, authenticated with check (true);
create policy "Allow public update products" on public.products for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete products" on public.products for delete to anon, authenticated using (true);

create policy "Allow public read quotations" on public.quotations for select to anon, authenticated using (true);
create policy "Allow public insert quotations" on public.quotations for insert to anon, authenticated with check (true);
create policy "Allow public update quotations" on public.quotations for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete quotations" on public.quotations for delete to anon, authenticated using (true);

create policy "Allow public read settings" on public.settings for select to anon, authenticated using (true);
create policy "Allow public insert settings" on public.settings for insert to anon, authenticated with check (true);
create policy "Allow public update settings" on public.settings for update to anon, authenticated using (true) with check (true);`}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#EFEBE2]">
              <a
                href="https://supabase.com/dashboard/project/dngdvqkvhtabpfskmhan/sql"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-[#F0EDE6] hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
              >
                <span>Open Supabase SQL Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSqlModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-[#14263D] hover:bg-[#1F3A5A] text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
