# Design Brief: Lagerverwaltungssystem

## 1. App Analysis

### What This App Does
A warehouse management system (Lagerverwaltungssystem) that tracks products, inventory levels, suppliers, orders, and incoming goods. It connects suppliers to products, manages stock across multiple storage locations, and monitors the full procurement-to-inventory lifecycle.

### Who Uses This
Warehouse managers and logistics staff who need quick visibility into stock levels, pending orders, and incoming deliveries. They work fast-paced environments where knowing what's low, what's arriving, and what needs attention is critical.

### The ONE Thing Users Care About Most
**Stock health** - immediately seeing which products are running low (below minimum stock) and what orders/deliveries are expected. A warehouse manager opening this dashboard needs to know: "Do I have stock problems right now?"

### Primary Actions (IMPORTANT!)
1. **Wareneingang erfassen** → Primary Action Button (recording incoming goods is the most frequent daily task)
2. Neue Bestellung anlegen (creating new orders when stock is low)
3. Bestand anpassen (adjusting inventory after counts)

---

## 2. What Makes This Design Distinctive

### Visual Identity
An industrial, functional aesthetic with warm concrete-gray undertones and a bold amber accent color. The design feels like a modern logistics control room - professional, efficient, but not sterile. The amber accent signals alerts and actions, creating urgency where needed while keeping the overall feel calm and organized.

### Layout Strategy
Desktop uses a 65/35 left-heavy split: the left side dominates with the hero stock health indicator and order status, while the right column provides a compact activity feed and quick stats. This creates a clear "command center on left, details on right" mental model. The hero KPI (products below minimum stock) uses massive typography (64px) to grab attention immediately.

### Unique Element
The stock health hero uses a "gauge" visual metaphor - a large circular progress ring showing percentage of products with healthy stock levels. The ring uses a thick 10px stroke with amber for the healthy portion and a subtle gray track. This creates an instantly readable health check that feels more sophisticated than a plain number.

---

## 3. Theme & Colors

### Font
- **Family:** Space Grotesk
- **URL:** `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap`
- **Why this font:** Space Grotesk has an industrial, technical character that suits warehouse/logistics operations. Its slightly geometric forms feel modern and data-focused without being cold.

### Color Palette
All colors as complete hsl() functions:

| Purpose | Color | CSS Variable |
|---------|-------|--------------|
| Page background | `hsl(40 10% 97%)` | `--background` |
| Main text | `hsl(220 15% 20%)` | `--foreground` |
| Card background | `hsl(0 0% 100%)` | `--card` |
| Card text | `hsl(220 15% 20%)` | `--card-foreground` |
| Borders | `hsl(40 10% 88%)` | `--border` |
| Primary action (amber) | `hsl(38 92% 50%)` | `--primary` |
| Text on primary | `hsl(40 10% 10%)` | `--primary-foreground` |
| Accent highlight | `hsl(38 70% 95%)` | `--accent` |
| Muted background | `hsl(40 10% 94%)` | `--muted` |
| Muted text | `hsl(220 10% 50%)` | `--muted-foreground` |
| Success/healthy | `hsl(152 60% 42%)` | (component use) |
| Warning/low stock | `hsl(38 92% 50%)` | (component use) |
| Error/critical | `hsl(0 72% 51%)` | `--destructive` |

### Why These Colors
The warm off-white background (slight cream undertone) creates a softer, less clinical feel than pure white. The amber primary is distinctive and carries industrial/safety connotations (like warehouse signage). The dark blue-gray text provides excellent readability while being softer than pure black.

### Background Treatment
Solid warm off-white (`hsl(40 10% 97%)`) - intentionally plain to let the cards and data stand out. The warmth comes from the subtle yellow undertone in the gray.

---

## 4. Mobile Layout (Phone)

### Layout Approach
Mobile prioritizes the stock health check as a full-width hero that dominates the first viewport. Secondary stats use a compact horizontal scroll strip rather than stacked cards, saving vertical space. The design creates visual hierarchy through size contrast: hero is massive, everything else is compact.

### What Users See (Top to Bottom)

**Header:**
- Left: "Lagerverwaltung" title in Space Grotesk 600 weight
- Right: Current date (formatted as "13. Jan 2026")

**Hero Section (The FIRST thing users see):**
- Takes 50% of viewport height
- Large circular progress ring (180px diameter) showing stock health percentage
- Inside ring: The number of products below minimum (e.g., "3") in 48px bold
- Below ring: "Produkte unter Mindestbestand" label
- Ring color: amber fill on gray track
- Tappable to see list of low-stock products

**Section 2: Quick Stats Strip**
- Horizontal scrollable row of compact stat badges
- Stats: Offene Bestellungen | Lieferungen heute | Gesamtprodukte | Lagerorte
- Each stat: icon + number + label, in a pill-shaped container
- 12px vertical padding, minimal style

**Section 3: Offene Bestellungen**
- Card with "Offene Bestellungen" header
- List of 3-4 most recent pending orders
- Each row: Order number, supplier name, expected date, status badge
- Compact rows (48px height)
- "Alle anzeigen" link at bottom

**Section 4: Letzte Wareneingänge**
- Card with "Letzte Wareneingänge" header
- List of 3-4 recent incoming goods
- Each row: Product name, quantity, quality status badge, date
- "Alle anzeigen" link at bottom

**Bottom Fixed Action:**
- Fixed bottom bar with amber "Wareneingang erfassen" button
- Full width minus 16px margins
- 56px height, rounded corners

### What is HIDDEN on Mobile
- Detailed charts (shown only on desktop)
- Supplier ratings breakdown
- Storage location distribution
- Extended order history

### Touch Targets
- All tappable rows minimum 48px height
- Primary action button 56px height
- Stats in scroll strip 44px height

### Interactive Elements
- Hero ring: tap to see low-stock product list (sheet slides up)
- Order rows: tap to see order details
- Wareneingang rows: tap to see delivery details

---

## 5. Desktop Layout

### Overall Structure
A 65/35 left-heavy split with clear visual hierarchy. The left column contains the hero metrics and detailed data tables. The right column serves as a "sidebar" with activity feed and quick actions. Eye flow: Hero (top-left) → Secondary stats (below hero) → Recent activity (right).

### Column Layout
- Left column (65%): Hero stock health + orders table + stock trend chart
- Right column (35%): Quick stats cards + recent Wareneingänge feed + action buttons

### Layout Diagram (ASCII)
```
┌────────────────────────────────┐  ┌─────────────────────┐
│                                │  │   Quick Stats       │
│      HERO: Stock Health        │  │   (stacked 3x)      │
│   (gauge + low stock count)    │  ├─────────────────────┤
│           65%                  │  │                     │
│                                │  │   Wareneingänge     │
└────────────────────────────────┘  │   Feed (scroll)     │
                                    │        35%          │
┌────────────────────────────────┐  │                     │
│                                │  ├─────────────────────┤
│   Offene Bestellungen Table    │  │  [Action Button]    │
│   (sortable, filterable)       │  │  Wareneingang       │
│                                │  │  erfassen           │
└────────────────────────────────┘  └─────────────────────┘

┌────────────────────────────────┐
│   Bestelltrend Chart           │
│   (line chart, last 30 days)   │
└────────────────────────────────┘
```

### What Appears on Hover
- Order rows: subtle background highlight, "Details anzeigen" text appears
- Wareneingang items: timestamp appears
- Quick stats: tooltip with exact numbers and change indicators

### Clickable/Interactive Areas
- Hero gauge: click to open modal with full list of low-stock products
- Order rows: click to expand inline details or open modal
- Wareneingang items: click for full delivery details
- All stat cards: click to navigate to filtered list views

---

## 6. Components

### Hero KPI: Stock Health Gauge
The MOST important metric - shows what percentage of products have healthy stock levels.

- **Title:** Lagergesundheit
- **Data source:** Lagerbestand + Produkte (join on produkt reference)
- **Calculation:**
  1. Get all Lagerbestand records
  2. For each, compare `menge` (current) with linked Produkte's `mindestbestand`
  3. Count products where menge < mindestbestand
  4. Percentage = (healthy / total) * 100
- **Display:**
  - Large circular progress ring (200px desktop, 180px mobile)
  - Percentage in center (64px bold)
  - Below: Count of low-stock products (e.g., "3 Produkte unter Minimum")
- **Context shown:** Percentage healthy vs total, count of problems
- **Why this is the hero:** Warehouse managers need instant visibility into stock problems. This answers "Is my warehouse healthy?" in one glance.

### Secondary KPIs

**Offene Bestellungen**
- Source: Bestellungen
- Calculation: Count where status IN ('entwurf', 'bestellt', 'bestaetigt', 'teilweise_geliefert')
- Format: number
- Display: Card with icon, large number (32px), label below

**Lieferungen erwartet (diese Woche)**
- Source: Bestellungen
- Calculation: Count where erwartetes_lieferdatum is within current week
- Format: number
- Display: Card with icon, large number (32px), label below

**Gesamtwert offener Bestellungen**
- Source: Bestellungen (filtered as above)
- Calculation: Sum of gesamtpreis
- Format: currency (EUR)
- Display: Card with icon, formatted number (€1.234,56), label below

### Chart: Bestelltrend
- **Type:** Area chart - shows volume over time, area fill creates visual weight
- **Title:** Bestellungen (letzte 30 Tage)
- **What question it answers:** Are we ordering more or less than usual? Any patterns?
- **Data source:** Bestellungen
- **X-axis:** bestelldatum, grouped by day, labeled as "TT.MM"
- **Y-axis:** Count of orders OR sum of gesamtpreis (toggle)
- **Mobile simplification:** Hidden on mobile to save space

### Lists/Tables

**Offene Bestellungen (Desktop Table)**
- Purpose: See all pending orders at a glance, sorted by urgency
- Source: Bestellungen where status NOT IN ('geliefert', 'storniert')
- Fields shown:
  - bestellnummer
  - lieferant (resolved via lookup) → firmenname
  - produkt (resolved via lookup) → produktname
  - erwartetes_lieferdatum (formatted)
  - status (as colored badge)
  - gesamtpreis (formatted as €)
- Desktop style: Full table with sortable columns
- Sort: By erwartetes_lieferdatum ascending (soonest first)
- Limit: 10 items, pagination available

**Offene Bestellungen (Mobile List)**
- Same data, simplified display
- Each row: Order # + Supplier | Expected date | Status badge
- Sort: Same as desktop
- Limit: 5 items

**Letzte Wareneingänge Feed**
- Purpose: Track recent deliveries and quality results
- Source: Wareneingang, sorted by erfassungsdatum DESC
- Fields shown:
  - produkt → produktname
  - gelieferte_menge + unit (from product)
  - qualitaetspruefung (as icon/badge)
  - lieferdatum (formatted)
- Mobile style: Compact cards
- Desktop style: List items in sidebar
- Sort: By erfassungsdatum descending (newest first)
- Limit: 5 items

### Primary Action Button (REQUIRED!)

- **Label:** "Wareneingang erfassen"
- **Action:** add_record
- **Target app:** Wareneingang (APP_ID: 69131a4f29930062bbf5d304)
- **What data:** Form with fields:
  - bestellung (select from open orders)
  - produkt (auto-filled from selected order, or manual select)
  - lieferant (auto-filled from selected order)
  - lieferdatum (date picker, default today)
  - gelieferte_menge (number input)
  - lagerort (select from options)
  - qualitaetspruefung (select: bestanden/mit_maengeln/nicht_bestanden/nicht_geprueft)
  - lieferscheinnummer (text input)
  - erfasst_von (text input, could default to user name)
- **Mobile position:** bottom_fixed (always visible amber bar)
- **Desktop position:** sidebar (prominent button in right column)
- **Why this action:** Recording incoming goods is the most frequent daily task in warehouse operations. Every delivery needs to be logged immediately for accurate inventory.

---

## 7. Visual Details

### Border Radius
- Cards: 12px (rounded)
- Buttons: 10px
- Badges/Pills: 999px (full pill)
- Input fields: 8px

### Shadows
- Cards: subtle (`0 1px 3px hsl(220 15% 20% / 0.08)`)
- Hover state: slightly elevated (`0 4px 12px hsl(220 15% 20% / 0.12)`)
- Primary button: colored shadow (`0 4px 14px hsl(38 92% 50% / 0.4)`)

### Spacing
- Page padding: 24px desktop, 16px mobile
- Card padding: 24px desktop, 16px mobile
- Between cards: 20px desktop, 16px mobile
- Tight spacing within card sections: 12px

### Animations
- **Page load:** Staggered fade-in (cards animate in sequence, 50ms delay each)
- **Hover effects:** Scale 1.02 on interactive cards, background color shift on rows
- **Tap feedback:** Brief scale down (0.98) on buttons, ripple effect on primary action
- **Number counting:** Hero percentage animates from 0 to final value over 800ms

---

## 8. CSS Variables (Copy Exactly!)

The implementer MUST copy these values exactly into `src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

:root {
  --background: hsl(40 10% 97%);
  --foreground: hsl(220 15% 20%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(220 15% 20%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(220 15% 20%);
  --primary: hsl(38 92% 50%);
  --primary-foreground: hsl(40 10% 10%);
  --secondary: hsl(40 10% 94%);
  --secondary-foreground: hsl(220 15% 20%);
  --muted: hsl(40 10% 94%);
  --muted-foreground: hsl(220 10% 50%);
  --accent: hsl(38 70% 95%);
  --accent-foreground: hsl(38 92% 35%);
  --destructive: hsl(0 72% 51%);
  --border: hsl(40 10% 88%);
  --input: hsl(40 10% 88%);
  --ring: hsl(38 92% 50%);
  --radius: 0.75rem;

  --chart-1: hsl(38 92% 50%);
  --chart-2: hsl(152 60% 42%);
  --chart-3: hsl(220 15% 60%);
  --chart-4: hsl(38 70% 70%);
  --chart-5: hsl(0 72% 60%);
}

body {
  font-family: 'Space Grotesk', sans-serif;
}
```

---

## 9. Implementation Checklist

The implementer should verify:
- [ ] Space Grotesk font loaded from Google Fonts URL
- [ ] All CSS variables copied exactly to index.css
- [ ] Mobile layout matches Section 4 (hero gauge dominant, horizontal scroll stats)
- [ ] Desktop layout matches Section 5 (65/35 split, asymmetric)
- [ ] Hero gauge is prominent with circular progress ring
- [ ] Amber accent color used for primary actions and warnings
- [ ] Low-stock products highlighted with warning styling
- [ ] "Wareneingang erfassen" button fixed at bottom on mobile
- [ ] Tables sortable on desktop
- [ ] Smooth staggered animations on page load
- [ ] All interactive elements have hover/tap states
