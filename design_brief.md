# Design Brief: Lagerverwaltungssystem Dashboard

## 1. App Analysis

### What This App Does
This app manages a small-to-medium warehouse: suppliers, purchase orders, products, current stock levels, and goods receipts. The dashboard must answer "Do we have enough stock right now?" and "What is coming in next?" while making it easy to record new goods arrivals.

### Who Uses This
Operations and warehouse managers who need quick, practical answers. They are not technical, so the dashboard must be clear, minimal, and task-focused.

### The ONE Thing Users Care About Most
Which products are at risk right now (below minimum stock) so they can act immediately.

### Primary Actions (IMPORTANT!)
1. Wareneingang erfassen -> Primary Action Button
2. Bestellung anlegen
3. Produkt anlegen
4. Lieferant pflegen

---

## 2. What Makes This Design Distinctive

### Visual Identity
A warm, paper-like background paired with a deep petrol-green primary and a brass accent creates an "industrial label" feel that fits warehouse work. The contrast is soft but confident, with a single bold accent used as a signal color for urgency.

### Layout Strategy
Asymmetric layout with a dominant hero card on the left and stacked operational lists on the right. The hero is oversized with generous whitespace and a unique status ribbon, while the secondary KPIs sit in a compact grid beneath it. This creates a clear visual anchor and a flow from "risk" -> "context" -> "details".

### Unique Element
An "Inventory Health Ribbon" inside the hero card: a thin horizontal gradient bar (green to amber to red) with a small brass marker showing the current healthy-stock percentage. This gives the hero a memorable, custom identity without adding clutter.

---

## 3. Theme & Colors

### Font
- **Family:** Space Grotesk
- **URL:** `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap`
- **Why this font:** Geometric but friendly, it looks modern and precise for analytics while still approachable for non-technical users.

### Color Palette
All colors as complete hsl() functions:

| Purpose | Color | CSS Variable |
|---------|-------|--------------|
| Page background | `hsl(36 33% 97%)` | `--background` |
| Main text | `hsl(218 17% 18%)` | `--foreground` |
| Card background | `hsl(36 30% 99%)` | `--card` |
| Card text | `hsl(218 17% 18%)` | `--card-foreground` |
| Borders | `hsl(30 14% 88%)` | `--border` |
| Primary action | `hsl(173 42% 32%)` | `--primary` |
| Text on primary | `hsl(0 0% 100%)` | `--primary-foreground` |
| Accent highlight | `hsl(32 78% 54%)` | `--accent` |
| Muted background | `hsl(36 22% 92%)` | `--muted` |
| Muted text | `hsl(215 12% 44%)` | `--muted-foreground` |
| Success/positive | `hsl(145 46% 36%)` | (component use) |
| Error/negative | `hsl(4 72% 50%)` | `--destructive` |

### Why These Colors
The warm base reduces glare for long sessions. The deep petrol primary feels operational and serious, while the brass accent signals attention without feeling alarmist. The palette stays calm but makes risk states instantly visible.

### Background Treatment
A subtle radial gradient from the top-left using the accent at ~8% opacity fading into the warm background. This keeps the page light but gives it an intentional, crafted feel.

---

## 4. Mobile Layout (Phone)

Design mobile as a COMPLETELY SEPARATE experience, not squeezed desktop.

### Layout Approach
The hero dominates the first viewport (about 55% of screen height) with a large number and the ribbon. A horizontal KPI strip provides quick stats without forcing a grid. Lists are stacked in a clear, single-column flow.

### What Users See (Top to Bottom)

**Header:**
- Title "Lager Cockpit" on the left
- Small text "Stand: dd.MM.yyyy" on the right

**Hero Section (The FIRST thing users see):**
- Title: "Kritische Bestaende"
- Large number (48-56px, bold) for count of products below minimum
- Subline: "X von Y Produkten unter Mindestbestand"
- Inventory Health Ribbon directly under the number
- This answers the most urgent question: where risk exists right now

**Section 2: KPI Strip**
- Horizontal scroll row of 4 compact cards (min-width 160px each)
- KPIs: Verfuegbar gesamt, Offene Bestellungen, Aktive Produkte, Lieferanten

**Section 3: Wareneingang Trend**
- Full-width card with a simplified area chart
- Show last 14 days only, minimal axis labels (every 3rd tick)

**Section 4: Kritische Bestaende Liste**
- Stacked cards showing Produktname, verfuegbar vs mindestbestand, Lagerort
- Emphasize deficit with a small red dot and bold deficit value

**Section 5: Aktuelle Bestellungen**
- Simple list cards with Bestellnummer, Lieferant, erwartetes Lieferdatum, Status badge

**Section 6: Letzte Wareneingaenge**
- List cards with Produkt, gelieferte Menge, Lieferdatum, Qualitaetspruefung badge

**Bottom Navigation / Action:**
- Fixed bottom primary button: "Wareneingang erfassen"

### Mobile-Specific Adaptations
- KPI cards scroll horizontally instead of shrinking.
- Lists switch to stacked cards with clear spacing.
- Chart reduces tick density and hides Y-axis label on small screens.

### Touch Targets
- All buttons and list items minimum height 44px.

### Interactive Elements (if applicable)
- Chart tooltip on tap.
- Primary action button opens a modal form.

---

## 5. Desktop Layout

### Overall Structure
A 12-column grid with an asymmetric layout: the hero and analytics occupy the left 8 columns, while operational lists stack in the right 4 columns. The eye goes hero -> KPI grid -> chart -> critical list -> right-side lists.

### Section Layout
- Top header row: title + "Stand" date on left, primary action button on right
- Left column (8/12):
  - Hero card (full width, ~260px tall)
  - KPI grid (2x2 cards)
  - Wareneingang Trend chart (full width, ~280px tall)
  - Kritische Bestaende table/list (full width)
- Right column (4/12):
  - Aktuelle Bestellungen card (tall, scrollable)
  - Letzte Wareneingaenge card (shorter, scrollable)

### What Appears on Hover
- Cards lift with a soft shadow and a thin accent border on hover.
- Chart points show tooltip with exact date and quantity.

### Clickable/Interactive Areas (if applicable)
- Primary action button opens the Wareneingang form dialog.
- Chart tooltip is hoverable.

---

## 6. Components

### Hero KPI
The MOST important metric that users see first.

- **Title:** Kritische Bestaende
- **Data source:** Produkte + Lagerbestand
- **Calculation:** For each product, sum Lagerbestand.verfuegbar. Count products where sum < Produkte.mindestbestand (treat missing stock as 0).
- **Display:** Large number with subline, plus Inventory Health Ribbon
- **Context shown:** "X von Y Produkten unter Mindestbestand" and a small badge showing percentage healthy
- **Why this is the hero:** It highlights immediate risk and drives action

### Secondary KPIs

**Verfuegbar gesamt**
- Source: Lagerbestand
- Calculation: Sum of verfuegbar
- Format: number (de-DE)
- Display: Compact card with bold number and muted label

**Offene Bestellungen**
- Source: Bestellungen
- Calculation: Count status in entwurf, bestellt, bestaetigt, teilweise_geliefert
- Format: number
- Display: Compact card with status chips (small dots for each status)

**Aktive Produkte**
- Source: Produkte
- Calculation: Count aktiv === 'aktiv'
- Format: number
- Display: Compact card

**Lieferanten**
- Source: Lieferanten
- Calculation: Count of Lieferanten records
- Format: number
- Display: Compact card with subline "Durchschn. Lieferzeit: X Tage" (average of lieferzeit)

### Chart (if applicable)
- **Type:** Area chart
- **Title:** Wareneingang Trend (30 Tage)
- **What question it answers:** Are incoming quantities rising or falling?
- **Data source:** Wareneingang
- **X-axis:** lieferdatum (fallback: erfassungsdatum), label as dd.MM
- **Y-axis:** Sum of gelieferte_menge per day
- **Mobile simplification:** last 14 days only, fewer ticks

### Lists/Tables (if applicable)

**Kritische Bestaende**
- Purpose: Show which products need action now
- Source: Produkte + Lagerbestand
- Fields shown: Produktname, verfuegbar, mindestbestand, Lagerort (or "Mehrere Lagerorte")
- Mobile style: stacked cards
- Desktop style: table-like list with columns
- Sort: largest deficit first
- Limit: 8 items

**Aktuelle Bestellungen**
- Purpose: Keep orders in view
- Source: Bestellungen + Lieferanten + Produkte
- Fields shown: Bestellnummer, Lieferant, Produkt, erwartetes Lieferdatum, Status badge
- Mobile style: stacked cards
- Desktop style: compact list
- Sort: erwartetes_lieferdatum ascending (soonest first)
- Limit: 6 items

**Letzte Wareneingaenge**
- Purpose: Confirm recent receipts and quality status
- Source: Wareneingang + Produkte + Lieferanten
- Fields shown: Produkt, Lieferant, gelieferte Menge, Lieferdatum, Qualitaetspruefung badge
- Mobile style: stacked cards
- Desktop style: compact list
- Sort: erfassungsdatum desc (fallback: lieferdatum)
- Limit: 6 items

### Primary Action Button (REQUIRED!)

- **Label:** Wareneingang erfassen
- **Action:** add_record
- **Target app:** Wareneingang
- **What data:** bestellung (applookup), produkt (applookup), lieferant (applookup), lieferdatum (date), gelieferte_menge (number), lagerort (lookup), qualitaetspruefung (lookup), lieferscheinnummer (text), erfasst_von (text), erfassungsdatum (datetimeminute), abweichungen (textarea), notizen (textarea)
- **Mobile position:** bottom_fixed
- **Desktop position:** header
- **Why this action:** Recording incoming goods is the most frequent warehouse task and updates stock visibility immediately

---

## 7. Visual Details

### Border Radius
- rounded (12px)

### Shadows
- subtle: soft 0 6px 18px rgba(0,0,0,0.06)

### Spacing
- spacious: generous padding in cards (20-24px)

### Animations
- **Page load:** staggered fade-up for hero, KPI grid, chart, lists (120ms gap)
- **Hover effects:** cards lift slightly with stronger shadow and thin accent border
- **Tap feedback:** buttons press with a 1px translate down

---

## 8. CSS Variables (Copy Exactly!)

The implementer MUST copy these values exactly into `src/index.css`:

```css
:root {
  --radius: 0.75rem;
  --background: hsl(36 33% 97%);
  --foreground: hsl(218 17% 18%);
  --card: hsl(36 30% 99%);
  --card-foreground: hsl(218 17% 18%);
  --popover: hsl(36 30% 99%);
  --popover-foreground: hsl(218 17% 18%);
  --primary: hsl(173 42% 32%);
  --primary-foreground: hsl(0 0% 100%);
  --secondary: hsl(34 24% 92%);
  --secondary-foreground: hsl(218 17% 20%);
  --muted: hsl(36 22% 92%);
  --muted-foreground: hsl(215 12% 44%);
  --accent: hsl(32 78% 54%);
  --accent-foreground: hsl(0 0% 100%);
  --destructive: hsl(4 72% 50%);
  --border: hsl(30 14% 88%);
  --input: hsl(30 14% 88%);
  --ring: hsl(173 42% 32%);
}
```

---

## 9. Implementation Checklist

The implementer should verify:
- [ ] Font loaded from URL above
- [ ] All CSS variables copied exactly
- [ ] Mobile layout matches Section 4
- [ ] Desktop layout matches Section 5
- [ ] Hero element is prominent as described
- [ ] Colors create the mood described in Section 2
