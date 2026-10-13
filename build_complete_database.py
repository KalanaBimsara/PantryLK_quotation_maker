import pymupdf
import json
import re
import os
import sys
from PIL import Image, ImageChops

os.makedirs('public/images/products', exist_ok=True)
os.makedirs('data', exist_ok=True)

def trim_whitespace(img, border=6):
    bg = Image.new(img.mode, img.size, (255, 255, 255))
    diff = ImageChops.difference(img, bg)
    bbox = diff.getbbox()
    if bbox:
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        if w > 10 and h > 10:
            x0 = max(0, bbox[0] - border)
            y0 = max(0, bbox[1] - border)
            x1 = min(img.width, bbox[2] + border)
            y1 = min(img.height, bbox[3] + border)
            return img.crop((x0, y0, x1, y1))
    return img

def parse_price(val):
    if not val:
        return 0.0
    val_clean = str(val).replace(',', '').replace(' ', '').replace('LKR', '').replace('Rs.', '').replace('Rs', '').strip()
    match = re.search(r'[\d]+(?:\.\d+)?', val_clean)
    if match:
        try:
            return float(match.group(0))
        except:
            return 0.0
    return 0.0

def clean_text(text):
    if not text:
        return ""
    text = str(text).replace('\r', ' ').replace('\n', ' ').strip()
    text = re.sub(r'\s+', ' ', text)
    return text

def get_product_title(desc, art_no):
    lines = [l.strip() for l in str(desc).split('\n') if l.strip()]
    if lines:
        title = lines[0]
        if len(lines) > 1 and len(title) < 20:
            title += " " + lines[1]
        return clean_text(title)
    return clean_text(art_no)

def crop_picture(page, page_pil, y0, y1, x0, x1, scale, item_id):
    try:
        # Check if there is an embedded image on the page whose rect overlaps significantly
        best_img = None
        best_overlap = 0
        target_rect = pymupdf.Rect(x0, y0, x1, y1)
        
        for img_info in page.get_images():
            xref = img_info[0]
            for r in page.get_image_rects(xref):
                overlap = r.intersect(target_rect)
                if overlap.is_valid and overlap.get_area() > best_overlap:
                    if r.height > 15 and r.width > 15:
                        best_overlap = overlap.get_area()
                        best_img = (xref, r)
        
        # If there's a strong embedded image match, we can crop its exact bounding box
        if best_img and best_overlap > 300:
            r = best_img[1]
            cx0 = max(0, int((r.x0 - 2) * scale))
            cy0 = max(0, int((r.y0 - 2) * scale))
            cx1 = min(page_pil.width, int((r.x1 + 2) * scale))
            cy1 = min(page_pil.height, int((r.y1 + 2) * scale))
        else:
            cx0 = max(0, int(x0 * scale))
            cy0 = max(0, int(y0 * scale))
            cx1 = min(page_pil.width, int(x1 * scale))
            cy1 = min(page_pil.height, int(y1 * scale))
            
        if cx1 > cx0 + 15 and cy1 > cy0 + 15:
            cropped = page_pil.crop((cx0, cy0, cx1, cy1))
            trimmed = trim_whitespace(cropped)
            if trimmed.mode in ('RGBA', 'P'):
                trimmed = trimmed.convert('RGB')
            out_file = f"public/images/products/{item_id}.jpg"
            trimmed.save(out_file, quality=90)
            return f"images/products/{item_id}.jpg"
    except Exception as e:
        print(f"Error cropping {item_id}: {e}")
    return ""

def process_all_files():
    all_products = []
    
    file_configs = [
        {
            'filename': 'AGT.pdf',
            'catalog': 'AGT',
            'category': 'AGT Boards & Panels',
            'pic_col_range': (159, 265)
        },
        {
            'filename': 'HEVEABOARD.pdf',
            'catalog': 'HeveaBoard',
            'category': 'HeveaBoard Melamine Panels',
            'pic_col_range': (116, 207)
        },
        {
            'filename': 'LG Himacs.pdf',
            'catalog': 'LG HI-MACS',
            'category': 'LG HI-MACS Solid Surfaces',
            'pic_col_range': (151, 243)
        },
        {
            'filename': 'PDS Allum Profiles.pdf',
            'catalog': 'PDS Aluminium Profiles',
            'category': 'Aluminium Handles & Glass Profiles',
            'pic_col_range': (169, 275)
        },
        {
            'filename': 'PDS Dustbin & Other PVC.pdf',
            'catalog': 'PDS PVC & Dustbins',
            'category': 'Cutlery Trays, Dustbins & Accessories',
            'pic_col_range': (159, 265)
        },
        {
            'filename': 'PDS HARDWARE & HANDLE.pdf',
            'catalog': 'PDS Hardware & Handles',
            'category': 'Cabinet Hardware, Hinges & Handles',
            'pic_col_range': (159, 265)
        },
        {
            'filename': 'PDS KITCHEN.pdf',
            'catalog': 'PDS Kitchen Storage',
            'category': 'Kitchen Tall Units & Storage Racks',
            'pic_col_range': (170, 285)
        },
        {
            'filename': 'PDS LIGHTING.pdf',
            'catalog': 'PDS Lighting',
            'category': 'LED Lighting & Power Supplies',
            'pic_col_range': (168, 298)
        },
        {
            'filename': 'PDS PVC Wall Paneling and Accessories.pdf',
            'catalog': 'PDS Wall Paneling',
            'category': 'PVC Wall Panels & Aluminium Trims',
            'pic_col_range': (129, 318)
        },
        {
            'filename': 'PDS WARDOBE.pdf',
            'catalog': 'PDS Wardrobe',
            'category': 'Wardrobe Accessories & Mirrors',
            'pic_col_range': (159, 265)
        },
        {
            'filename': 'SCHOCK.pdf',
            'catalog': 'SCHOCK Germany',
            'category': 'SCHOCK Granite Sinks & Mixer Taps',
            'pic_col_range': (159, 265)
        },
        {
            'filename': 'VESTEL Applinaces.pdf',
            'catalog': 'VESTEL Appliances',
            'category': 'VESTEL Built-in Kitchen Appliances',
            'pic_col_range': (280, 438)
        }
    ]
    
    scale = 150 / 72.0
    
    for cfg in file_configs:
        fname = cfg['filename']
        if not os.path.exists(fname):
            print(f"File {fname} not found!")
            continue
            
        print(f"\nProcessing {fname}...")
        doc = pymupdf.open(fname)
        current_collection = ""
        catalog_products = []
        
        for p_idx in range(len(doc)):
            page = doc[p_idx]
            pix = page.get_pixmap(dpi=150)
            page_pil = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            tabs = page.find_tables()
            if not tabs.tables:
                continue
                
            t = tabs.tables[0]
            extracted = t.extract()
            rows_meta = t.rows
            
            # Identify columns
            # For each extracted row:
            last_img_url = ""
            for r_i, r in enumerate(extracted):
                txt = ' '.join([str(x) for x in r if x is not None])
                
                # Check section titles
                if 'COLLECTION' in txt.upper() or 'COLLECTIONS' in txt.upper():
                    current_collection = txt.strip()
                    continue
                if 'Article' in txt and 'Product' in txt:
                    continue
                if 'Item Code' in txt and 'Description' in txt:
                    continue
                if 'PDS PVC WALL' in txt and len(txt) < 30:
                    continue
                    
                cells = [str(x).strip() if x is not None else '' for x in r]
                
                # Find price (usually in last column or next-to-last)
                p = 0.0
                price_col_idx = -1
                for c_idx in range(len(cells)-1, -1, -1):
                    c_val = cells[c_idx]
                    if c_val and any(d.isdigit() for d in c_val) and ('.' in c_val or ',' in c_val):
                        possible_p = parse_price(c_val)
                        if possible_p > 0:
                            p = possible_p
                            price_col_idx = c_idx
                            break
                            
                if p <= 0:
                    continue
                    
                # Extract fields
                sn_str = cells[0] if len(cells) > 0 else ""
                art_no = ""
                desc = ""
                unit = "No"
                sqf_rate = None
                
                if cfg['catalog'] == 'VESTEL Appliances':
                    # VESTEL layout: [SN, Item Code, None, Item Description, None, Image, Unit, Qua, MRP]
                    art_no = cells[1] if len(cells) > 1 else ""
                    desc = cells[3] if len(cells) > 3 else ""
                    unit = cells[6] if len(cells) > 6 and cells[6] else "No"
                elif cfg['catalog'] == 'HeveaBoard':
                    # [SN, Article No, Picture, Description, Unit, Qua, Per SQF, MRP]
                    art_no = cells[1] if len(cells) > 1 else ""
                    desc = cells[3] if len(cells) > 3 else ""
                    unit = cells[4] if len(cells) > 4 and cells[4] else "No"
                    if len(cells) > 6 and cells[6]:
                        sqf_p = parse_price(cells[6])
                        if sqf_p > 0:
                            sqf_rate = sqf_p
                else:
                    # Standard: [SN, Article No, Picture, Description, Unit, Qua, MRP]
                    art_no = cells[1] if len(cells) > 1 else ""
                    desc = cells[3] if len(cells) > 3 else ""
                    unit = cells[4] if len(cells) > 4 and cells[4] else "No"
                    
                # Clean art_no and desc
                art_no = clean_text(art_no)
                raw_desc = r[3] if len(r) > 3 and r[3] else (r[2] if len(r) > 2 else desc)
                if cfg['catalog'] == 'VESTEL Appliances' and len(r) > 3:
                    raw_desc = r[3]
                    
                desc_cleaned = clean_text(raw_desc)
                if not art_no:
                    # fallback to SN or first part of desc
                    art_no = sn_str if sn_str else f"ITEM-{len(catalog_products)+1}"
                    
                title = get_product_title(raw_desc, art_no)
                if not title or len(title) < 3:
                    title = f"{art_no} - {cfg['catalog']}"
                    
                # Generate unique ID
                safe_code = re.sub(r'[^a-zA-Z0-9]', '_', art_no).strip('_')
                if not safe_code:
                    safe_code = f"item_{len(all_products)+1}"
                prod_id = f"{cfg['catalog'].lower()[:4]}_{safe_code}_{len(all_products)+1}".replace(' ', '_').lower()
                
                # Image cropping
                row_meta = rows_meta[r_i] if r_i < len(rows_meta) else None
                img_url = ""
                if row_meta:
                    y0, y1 = row_meta.bbox[1], row_meta.bbox[3]
                    x0, x1 = cfg['pic_col_range']
                    img_url = crop_picture(page, page_pil, y0, y1, x0, x1, scale, prod_id)
                
                if img_url:
                    last_img_url = img_url
                elif last_img_url and ('edge' in desc_cleaned.lower() or 'eb' in art_no.lower() or 'banding' in desc_cleaned.lower() or 'adhesive' in desc_cleaned.lower()):
                    img_url = last_img_url
                
                # Subcategory assignment
                subcat = current_collection if current_collection else cfg['category']
                if 'Edge Band' in desc_cleaned or 'EB' in art_no or 'PVC Edge' in desc_cleaned:
                    subcat = "Edge Banding"
                elif 'MDF' in desc_cleaned or 'board' in desc_cleaned.lower():
                    subcat = "MDF & Panels"
                elif 'Handle' in desc_cleaned or 'Knob' in desc_cleaned:
                    subcat = "Handles & Knobs"
                elif 'Hinge' in desc_cleaned:
                    subcat = "Hinges & Hardware"
                elif 'Sink' in desc_cleaned:
                    subcat = "Kitchen Sinks"
                elif 'Tap' in desc_cleaned:
                    subcat = "Mixer Taps"
                elif 'Oven' in desc_cleaned or 'Cooker' in desc_cleaned or 'Hob' in desc_cleaned or 'Refrigerator' in desc_cleaned or 'Dishwasher' in desc_cleaned:
                    subcat = "Kitchen Appliances"
                elif 'LED' in desc_cleaned or 'Light' in desc_cleaned or 'transformer' in desc_cleaned.lower():
                    subcat = "Lighting"
                elif 'Dustbin' in desc_cleaned or 'Bin' in desc_cleaned or 'Hamper' in desc_cleaned or 'tray' in desc_cleaned.lower():
                    subcat = "Storage & Bins"
                    
                product = {
                    "id": prod_id,
                    "catalog": cfg['catalog'],
                    "category": cfg['category'],
                    "subcategory": subcat,
                    "sn": sn_str,
                    "articleNo": art_no,
                    "name": title,
                    "description": desc_cleaned,
                    "unit": unit if unit else "No",
                    "perSqfRate": sqf_rate,
                    "mrp": p,
                    "image": img_url,
                    "inStock": True
                }
                
                catalog_products.append(product)
                all_products.append(product)
                
        print(f" Extracted {len(catalog_products)} products from {fname}")
        
    print(f"\nTOTAL PRODUCTS EXTRACTED: {len(all_products)}")
    with open('data/products.json', 'w', encoding='utf-8') as f:
        json.dump(all_products, f, indent=2, ensure_ascii=False)
    print("Saved to data/products.json successfully!")

if __name__ == '__main__':
    process_all_files()
