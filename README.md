# Pantry LK Pvt Ltd - Next.js Quotation Maker

A full-stack **Next.js (React 19)** quotation maker and component catalog built specifically for **Pantry LK Pvt Ltd**.

---

## 🌟 Why Next.js Was Chosen
- **Unified Architecture**: Both the interactive React user interface and the backend API routes (`/api/products`, `/api/quotations`, `/api/settings`) are bundled in a single Next.js project.
- **Future Database Readiness**: While currently storing data in local JSON files (`data/products.json`), Next.js API route handlers allow switching to PostgreSQL, Supabase, Prisma, or MongoDB at any point in the future.
- **Turbopack Build Performance**: Production build compiles in under 3 seconds with server-side optimizations.
- **Cross-Device Ready**: Accessible locally at `http://localhost:3000` or on tablets/mobile devices over local Wi-Fi.

---

## 🌟 Features Included

1. **559 Components with Real Extracted Images**:
   - Extracted from all 12 PDF catalogs (65 pages total):
     - **AGT Panels & Profiles**: MDF boards, edge bandings, decorative profiles.
     - **HeveaBoard Melamine Panels**: Stone, Premium, Classic, Fabric, Higloss PET, and Synchronizing Collections with Per SQF rates.
     - **LG HI-MACS Solid Surfaces**: 12mm & 6mm acrylic surfaces, matching adhesives, and dispenser guns.
     - **PDS Aluminium Profiles**: Concealed handles (L & C profiles with/without LED), glass door frames, wireless touch switches, and power supplies.
     - **PDS Kitchen Storage**: Cutlery trays, anti-slip mats, adjustable legs, skirting clips, soft-closing bins, and hampers.
     - **PDS Hardware & Handles**: Soft-close hinges, corners, modern furniture handles, knobs, and pulls.
     - **PDS Tall Units & Storage**: Heavy-duty swing tall units, cleaning containers, wine racks, and stemware racks.
     - **PDS LED Lighting Solutions**: Drawer strip lights, PIR sensor lights, spot lights, hanging profiles, and transformers.
     - **PDS PVC Wall Paneling**: Crash-proof sheets, flute panels, aluminium joiners, and corners.
     - **PDS Wardrobe Accessories**: Extendable shoe racks, pant racks, pivoted closet mirrors, and swivel racks.
     - **SCHOCK Germany**: German granite kitchen sinks and mixer taps.
     - **VESTEL Turkey Appliances**: 4-door refrigerators, built-in electric ovens, hobs, hoods, and dishwashers.

2. **Live Quotation Calculator**:
   - Real-time line item multiplication (`Quantity × Rate`).
   - **Labour & Machinery Charge**: Automatically multiplies user-entered square footage by **Rs. 1,800.00 / sq.ft** (configurable in admin settings).
   - **Sales Commission**: Automatically calculates **5.0%** on the subtotal (materials + workmanship) and updates the grand total live.
   - Live Net Grand Total in Sri Lankan Rupees (**Rs. / LKR**).

3. **Quotation Generation & Sharing**:
   - Official letterhead view with customer details (Name, Contact, Address, Job No).
   - Complete itemized breakdown table with photos, units, quantities, rates, and totals.
   - Grand Total converted automatically to English words.
   - **Share via WhatsApp**: Pre-formats the itemized job summary and launches WhatsApp Web or Mobile with the client's number.
   - **Print / PDF Export**: Formatted for A4 sheets with `@media print`.

4. **Admin Dashboard**:
   - Search, edit prices, descriptions, units, or images of any component.
   - Add new custom components or delete existing items.
   - Change default Labour & Machinery charge rate (Rs. 1,800) and Sales Commission % (5.0%).
   - Manage company information (phone, address, email, terms).
   - One-click **Reset to PDF Catalog** to restore the default 559 items.
   - Saved Quotation History: View, reload, or delete previous client quotations.

---

## 🚀 How to Run

### 1. One-Click Windows Launcher
Double-click **`start_app.bat`** in this folder. It will launch the Next.js server and open the browser automatically.

### 2. Manual Commands
- **Start Production Server:**
  ```cmd
  npm run start
  ```
- **Start Development Mode:**
  ```cmd
  npm run dev
  ```
- **Rebuild Project:**
  ```cmd
  npm run build
  ```

Access the app:
- **Local:** `http://localhost:3000`
- **Network (Mobile / Tablet):** `http://<your-ip>:3000`

---

## 📁 Directory Structure

```text
pantry quotation/
├── app/
│   ├── page.jsx                 # Interactive React 19 Client Component
│   ├── layout.jsx               # Next.js Root Layout
│   ├── globals.css              # Tailwind CSS & Print styles
│   └── api/
│       ├── products/            # GET (all), POST (add)
│       │   ├── [id]/            # PUT (edit), DELETE (remove)
│       │   └── reset/           # POST (restore original PDF catalog)
│       ├── settings/            # GET & POST company & formula settings
│       └── quotations/          # GET, POST, & DELETE quote history
├── public/
│   └── images/
│       └── products/            # 559 extracted component images
├── data/
│   ├── products.json            # Active product catalog
│   ├── products_default.json    # Original PDF backup
│   ├── settings.json            # Charge rates & company info
│   └── quotations.json          # Saved quotation records
├── next.config.mjs              # Next.js configuration
├── package.json                 # Node dependencies & scripts
└── start_app.bat                # 1-click Windows launcher
```
