# Design Brief: Lagerverwaltungssystem Dashboard

## 1. App Analysis

### What This App Does
This is a comprehensive warehouse management system (Lagerverwaltungssystem) for tracking inventory, suppliers, orders, and goods receipts. It connects five apps: Products (Produkte), Stock Levels (Lagerbestand), Suppliers (Lieferanten), Orders (Bestellungen), and Goods Receipts (Wareneingang).

### Who Uses This
Warehouse managers and logistics staff who need to monitor stock levels, track incoming deliveries, manage supplier relationships, and place orders. They work in fast-paced environments and need quick access to critical inventory information.

### The ONE Thing Users Care About Most
**Current stock health** - Are there products running low? Are orders on track? Is anything critical that needs immediate attention? The hero should show overall inventory status with clear warnings for items below minimum stock levels.

### Primary Actions (IMPORTANT!)
1. **Wareneingang erfassen** (Record Goods Receipt) - Primary Action Button - This is the most frequent daily task
2. Neue Bestellung anlegen (Create New Order) - For restocking
3. Bestand korrigieren (Adjust Stock) - For inventory corrections

---

## 2. What Makes This Design Distinctive

This design uses a **cool industrial aesthetic** with slate-blue tones that evoke the professional environment of a warehouse. The color scheme balances the utilitarian nature of inventory management with a modern, refined look. A distinctive deep teal accent color signals action items and critical information, creating visual urgency without feeling alarming. The generous whitespace and clear card separations make scanning complex data effortless.

---

## 3. Theme & Colors

### Font
- **Family:** Space Grotesk
- **URL:** `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap`
- **Why this font:** Space Grotesk has a technical, data-focused character that suits inventory management. Its slightly geometric forms feel precise and reliable - perfect for numbers and data displays.

### Color Palette
All colors as complete hsl() functions:

| Purpose | Color | CSS Variable |
|---------|-------|--------------|
| Page background | `hsl(210 20% 98%)` | `--background` |
| Main text | `hsl(215 25% 17%)` | `--foreground` |
| Card background | `hsl(0 0% 100%)` | `--card` |
| Card text | `hsl(215 25% 17%)` | `--card-foreground` |
| Borders | `hsl(210 15% 90%)` | `--border` |
| Primary action | `hsl(173 58% 39%)` | `--primary` |
| Text on primary | `hsl(0 0% 100%)` | `--primary-foreground` |
| Accent highlight | `hsl(173 58% 39%)` | `--accent` |
| Muted background | `hsl(210 15% 96%)` | `--muted` |
| Muted text | `hsl(215 15% 47%)` | `--muted-foreground` |
| Success/positive | `hsl(142 71% 45%)` | (component use) |
| Warning | `hsl(38 92% 50%)` | (component use) |
| Error/negative | `hsl(0 84% 60%)` | `--destructive` |

### Why These Colors
The cool slate-blue base creates a professional, industrial atmosphere. The teal primary (`hsl(173 58% 39%)`) is distinctive yet calming - authoritative for call-to-action buttons while not feeling aggressive. This teal stands out beautifully against the cool gray background, making primary actions immediately visible.

### Background Treatment
The background uses a subtle cool off-white (`hsl(210 20% 98%)`) with a slight blue undertone. This isn't plain white - it has personality while remaining professional. Cards use pure white to create clear visual separation and depth.

---

## 4. Mobile Layout (Phone)

Design mobile as a COMPLETELY SEPARATE experience, not squeezed desktop.

### What Users See (Top to Bottom)

**Header:**
- App title "Lager" (short for mobile) left-aligned, 20px, font-weight 600
- Small icon button for settings/menu on right

**Hero Section (The FIRST thing users see):**
- **Alert Banner** (if items are low): Red/amber background strip showing "X Artikel unter Mindestbestand" - this is the most critical information
- **Quick Stats Row**: Three compact stat boxes side-by-side showing:
  - Total Products count (large number)
  - Pending Orders count (large number)
  - Today's Receipts count (large number)
- Why this is the hero: Warehouse staff need immediate situational awareness

**Section 2: Kritische Artikel (Low Stock Warning)**
- Horizontal scrollable cards showing products below minimum stock
- Each card: Product name, current stock, minimum stock, deficit amount
- Red indicator bar showing severity
- Max 5 items shown, "Alle anzeigen" link if more

**Section 3: Anstehende Lieferungen (Upcoming Deliveries)**
- Simple list showing next 3 expected deliveries
- Each row: Order number, supplier name, expected date, status badge
- Sorted by expected delivery date

**Section 4: Letzte Wareneingänge (Recent Receipts)**
- Last 5 goods receipts as compact cards
- Product name, quantity received, date
- Tap to see full details

**Bottom Navigation / Action:**
- **Fixed bottom action button**: "Wareneingang erfassen" - large teal button, 56px height, full width with padding
- This is the primary action - always accessible with one tap

### What is HIDDEN on Mobile
- Detailed supplier information
- Full order history
- Charts and graphs (too complex for small screen)
- Extended product details
- Location breakdown chart

### Touch Targets
- All tap targets minimum 44px height
- Cards have comfortable 12px padding
- Action button is extra large (56px) for easy thumb access

---

## 5. Desktop Layout

### Overall Structure
Two-column layout with 65/35 split. Left column for primary data and KPIs, right column for lists and secondary information. Maximum content width of 1400px, centered.

### Column Layout
- **Left column (65%)**: Hero KPIs at top (4 cards in a row), then Low Stock Alert list, then Recent Activity chart
- **Right column (35%)**: Order Status breakdown, Upcoming Deliveries list, Top Suppliers

### What Appears on Hover
- Cards show subtle shadow elevation on hover
- Table rows highlight with light background
- Action buttons show slightly darker shade
- Product names in lists become underlined, indicating they're clickable

---

## 6. Components

### Hero KPI
The MOST important metric that users see first.

- **Title:** Kritische Artikel
- **Data source:** Lagerbestand + Produkte (joined)
- **Calculation:** Count of products where `menge < mindestbestand`
- **Display:** Large number (48px, font-weight 700) with warning icon. Red text if > 0, green if 0.
- **Context shown:** "von X Produkten" showing total product count for context
- **Why this is the hero:** Stock-outs are the biggest operational risk in warehouse management

### Secondary KPIs

**Gesamtprodukte (Total Products)**
- Source: Produkte (count where aktiv = 'aktiv')
- Calculation: Count
- Format: Number
- Display: Card with icon, number 36px

**Offene Bestellungen (Open Orders)**
- Source: Bestellungen (where status in ['bestellt', 'bestaetigt', 'teilweise_geliefert'])
- Calculation: Count
- Format: Number
- Display: Card with icon, number 36px

**Wareneingänge Heute (Today's Receipts)**
- Source: Wareneingang (where lieferdatum = today)
- Calculation: Count
- Format: Number
- Display: Card with icon, number 36px

### Chart (if applicable)
- **Type:** Bar chart - shows categorical comparison clearly
- **Title:** Bestand nach Lagerort
- **What question it answers:** Where is our inventory distributed? Are any locations overloaded or empty?
- **Data source:** Lagerbestand
- **X-axis:** Lagerort (storage location names)
- **Y-axis:** Sum of menge (total quantity)
- **Mobile simplification:** Hidden on mobile - too complex for small screen

### Lists/Tables (if applicable)

**Kritische Artikel (Low Stock Items)**
- Purpose: Alert users to products that need immediate reordering
- Source: Lagerbestand + Produkte (where menge < mindestbestand)
- Fields shown: Produktname, Artikelnummer, Aktueller Bestand, Mindestbestand, Fehlmenge
- Mobile style: Horizontal scrollable cards
- Desktop style: Table with sortable columns
- Sort: By deficit (most critical first)
- Limit: 10 items, with "Alle anzeigen" link

**Anstehende Lieferungen (Upcoming Deliveries)**
- Purpose: Show what's coming in so staff can prepare
- Source: Bestellungen (where status in ['bestellt', 'bestaetigt'] and erwartetes_lieferdatum >= today)
- Fields shown: Bestellnummer, Lieferant (via lookup), Erwartetes Datum, Status
- Mobile style: Simple list cards
- Desktop style: Compact table
- Sort: By erwartetes_lieferdatum ascending
- Limit: 5 items

**Letzte Wareneingänge (Recent Receipts)**
- Purpose: Quick reference of recent activity
- Source: Wareneingang
- Fields shown: Produkt (via lookup), Gelieferte Menge, Lieferdatum, Qualitätsprüfung status
- Mobile style: Compact cards
- Desktop style: Table
- Sort: By lieferdatum descending
- Limit: 5 items

### Primary Action Button (REQUIRED!)

- **Label:** "Wareneingang erfassen"
- **Action:** add_record
- **Target app:** Wareneingang
- **What data:** Form with fields: Bestellung (select), Produkt (select), Lieferant (select), Lieferdatum, Gelieferte Menge, Lagerort (select), Qualitätsprüfung (select), Lieferscheinnummer
- **Mobile position:** bottom_fixed (always visible, easy thumb access)
- **Desktop position:** header (top right of dashboard)
- **Why this action:** Recording incoming goods is the most frequent task in warehouse operations - it needs to be instant and frictionless

---

## 7. Visual Details

### Border Radius
Rounded (8px) - `--radius: 0.5rem` - Professional but not too soft

### Shadows
Subtle - Cards use `shadow-sm` (0 1px 2px 0 rgb(0 0 0 / 0.05)). On hover, elevate to `shadow-md`.

### Spacing
Normal - Standard spacing with comfortable breathing room. Card padding 24px on desktop, 16px on mobile.

### Animations
- **Page load:** Subtle fade-in (200ms)
- **Hover effects:** Cards elevate with shadow transition (150ms ease)
- **Tap feedback:** Scale down slightly (0.98) on press

---

## 8. CSS Variables (Copy Exactly!)

The implementer MUST copy these values exactly into `src/index.css`:

```css
:root {
  --radius: 0.5rem;
  --background: hsl(210 20% 98%);
  --foreground: hsl(215 25% 17%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(215 25% 17%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(215 25% 17%);
  --primary: hsl(173 58% 39%);
  --primary-foreground: hsl(0 0% 100%);
  --secondary: hsl(210 15% 96%);
  --secondary-foreground: hsl(215 25% 17%);
  --muted: hsl(210 15% 96%);
  --muted-foreground: hsl(215 15% 47%);
  --accent: hsl(173 58% 39%);
  --accent-foreground: hsl(0 0% 100%);
  --destructive: hsl(0 84% 60%);
  --border: hsl(210 15% 90%);
  --input: hsl(210 15% 90%);
  --ring: hsl(173 58% 39%);
  --chart-1: hsl(173 58% 39%);
  --chart-2: hsl(210 60% 50%);
  --chart-3: hsl(142 71% 45%);
  --chart-4: hsl(38 92% 50%);
  --chart-5: hsl(280 60% 50%);
}
```

---

## 9. Implementation Checklist

The implementer should verify:
- [ ] Font loaded from URL above (Space Grotesk)
- [ ] All CSS variables copied exactly
- [ ] Mobile layout matches Section 4
- [ ] Desktop layout matches Section 5
- [ ] Hero element (Kritische Artikel count) is prominent as described
- [ ] Colors create the cool industrial mood described in Section 2
- [ ] Primary action button is fixed at bottom on mobile
- [ ] Low stock items highlighted with red/warning indicators
- [ ] All applookup fields use extractRecordId() helper
