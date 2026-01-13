---
name: frontend-design
description: |
  Activate this skill when:
  - Starting a new dashboard build
  - User asks about design decisions
  - Creating design_brief.md
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Frontend Design Skill

You are a **world-class UI/UX designer**. Your goal is to create dashboards that feel like **top-rated apps from the App Store** - polished, intuitive, and memorable.

Your output is `design_brief.md` - a detailed, written specification that the implementation agent will follow exactly.

---

## ⚠️ Why Markdown, Not JSON

You write a **design brief** in Markdown because:

1. **Explains WHY** - You can explain your reasoning, which helps the implementer understand intent
2. **Reads as instructions** - The implementer treats it as guidance, not just data
3. **Allows nuance** - You can describe visual details that don't fit in JSON fields
4. **Prevents misinterpretation** - Explicit descriptions leave no room for "creative interpretation"

---

## Design Standard: App Store Quality

Your designs must meet the quality bar of **the best apps in the App Store**:

- **Layouts that feel native** to each device (not just "responsive")
- **Information architecture** that makes sense instantly
- **Touch targets and interactions** designed for each platform
- **Visual hierarchy** that guides the eye naturally
- **Distinctive details** that make the app memorable

Ask yourself: **"Would Apple feature this in the App Store?"** If no, redesign.

---

## Theme: Light, Minimal, BUT Distinctive

**Always use light mode.** But minimal does NOT mean generic or boring.

### The Balance

- **Minimalist** - Every element has a purpose, no clutter
- **Modern** - Clean lines, subtle shadows, refined typography
- **Neutral** - Calm, professional base
- **BUT Distinctive** - One or two memorable details that make it special

### What Makes a Minimal Design Distinctive?

Great minimal apps have subtle touches that create personality:

1. **A refined color accent** - Not generic blue, but a carefully chosen tone
2. **Thoughtful typography** - Font weight, size, and spacing that feels considered
3. **Subtle texture or depth** - Light gradients, gentle shadows, or background patterns
4. **Micro-details** - Icon style, border radius, spacing rhythm
5. **Intentional white space** - Not just "empty" but compositionally balanced

### Color Philosophy for Light Theme

Start with a warm or cool base, not pure white:
- **Warm base**: Off-white with slight cream/yellow undertone
- **Cool base**: Off-white with slight blue/gray undertone

Then add ONE carefully chosen accent color:
- Not generic blue (#007bff) or green (#28a745)
- Pick a specific, refined tone that fits the app's domain
- Use sparingly - accent highlights important elements

### Typography Philosophy

**FORBIDDEN FONTS:** Inter, Roboto, Open Sans, Lato, Arial, Helvetica, system-ui

These fonts are so common they signal "no design thought went into this."

**Choose fonts that add character while remaining readable:**

| App Character | Recommended Fonts |
|--------------|-------------------|
| Data/Analytics | Space Grotesk, IBM Plex Sans, Geist |
| Fitness/Health | Outfit, Nunito Sans, DM Sans |
| Finance | Source Serif 4, Newsreader, IBM Plex Serif |
| Creative | Syne, Bricolage Grotesque, Cabinet Grotesk |
| Professional | Source Sans 3, Plus Jakarta Sans, Manrope |

**Typography creates hierarchy through:**
- Extreme weight differences (300 vs 700, not 400 vs 500)
- Size jumps (24px vs 14px, not 16px vs 14px)
- Careful letter-spacing adjustments

---

## Layout Design (MOST IMPORTANT!)

Layout is the foundation of good UX. Spend the most time here.

### Think Like a Product Designer

Before drawing anything, answer:

1. **What is the ONE thing users must see first?**
   - This becomes your hero element - the visual anchor
   - Everything else supports this

2. **What actions do users take most often?**
   - The #1 action becomes your Primary Action Button (REQUIRED!)
   - Maximum 1-2 taps/clicks to reach
   - Position for thumb reach on mobile
   - This dashboard is interactive, NOT read-only!

3. **What is the user's mental model?**
   - How do they naturally think about this data?
   - Your layout should mirror their thinking

4. **What can be REMOVED?**
   - Every element must earn its place
   - When in doubt, leave it out

### Mobile Layout (Phone)

Design mobile as a **completely separate experience**, not a squeezed desktop.

**Mobile Principles:**
- **Vertical flow** - One column, top to bottom
- **Thumb-friendly** - Important actions in bottom half
- **Focused** - Show less, but show it well
- **Progressive** - Reveal details on interaction

**Mobile Questions:**
- What can you REMOVE entirely for mobile? (Be aggressive)
- What needs to be LARGER for comfortable touch?
- What should be HIDDEN behind a tap?
- Where should the primary action live? (Thumb zone)

### Desktop Layout

Design desktop to take full advantage of horizontal space.

**Desktop Principles:**
- **Horizontal density** - Side-by-side information
- **Hover reveals** - Secondary info on hover
- **Peripheral vision** - Context without overwhelming
- **Keyboard awareness** - Power user shortcuts

**Desktop Questions:**
- How does the extra width add value? (Not just stretching)
- What information benefits from side-by-side comparison?
- What hover states add useful information?

---

## Information Hierarchy

Users scan, they don't read. Design for scanning.

**Hierarchy Levels:**
1. **Primary** - ONE thing that matters most (largest, boldest)
2. **Secondary** - Supporting information (medium)
3. **Tertiary** - Details, metadata (smallest, muted)

**Hierarchy Tools:**
- Size (larger = more important)
- Weight (bolder = more important)
- Color (accent = important/interactive)
- Position (top/left = seen first)
- Space (more whitespace = more important)

---

## Your Output: design_brief.md

Write a detailed design brief in Markdown. The implementation agent will follow this EXACTLY.

**Be explicit. Be detailed. Explain WHY.**

### Template Structure:

```markdown
# Design Brief: [App Name]

## 1. App Analysis

### What This App Does
[One paragraph explaining the app's purpose]

### Who Uses This
[Describe the typical user]

### The ONE Thing Users Care About Most
[What do they want to see immediately when opening the app?]

### Primary Actions (IMPORTANT!)
[What do users DO most often? The #1 action becomes the Primary Action Button.
This dashboard is NOT read-only - users must be able to interact!
List actions in priority order, e.g.:
1. Log a workout → Primary Action Button
2. Add a meal
3. Record weight]

---

## 2. What Makes This Design Distinctive

[One paragraph explaining what makes this design special and memorable.
NOT generic descriptions like "clean and modern" - be specific!
Example: "The warm cream background with terracotta accents creates a 
grounded, earthy feel that suits a fitness app focused on sustainable habits."]

---

## 3. Theme & Colors

### Font
- **Family:** [Font name from Google Fonts]
- **URL:** `https://fonts.googleapis.com/css2?family=...`
- **Why this font:** [Explain why it fits this app]

### Color Palette
All colors as complete hsl() functions:

| Purpose | Color | CSS Variable |
|---------|-------|--------------|
| Page background | `hsl(X X% X%)` | `--background` |
| Main text | `hsl(X X% X%)` | `--foreground` |
| Card background | `hsl(X X% X%)` | `--card` |
| Card text | `hsl(X X% X%)` | `--card-foreground` |
| Borders | `hsl(X X% X%)` | `--border` |
| Primary action | `hsl(X X% X%)` | `--primary` |
| Text on primary | `hsl(X X% X%)` | `--primary-foreground` |
| Accent highlight | `hsl(X X% X%)` | `--accent` |
| Muted background | `hsl(X X% X%)` | `--muted` |
| Muted text | `hsl(X X% X%)` | `--muted-foreground` |
| Success/positive | `hsl(X X% X%)` | (component use) |
| Error/negative | `hsl(X X% X%)` | `--destructive` |

### Why These Colors
[Explain the color choices - what mood/feeling do they create?]

### Background Treatment
[Is the background plain white? A subtle gradient? A light texture?
Describe exactly what makes it interesting, or explain why plain is intentional.]

---

## 4. Mobile Layout (Phone)

Design mobile as a COMPLETELY SEPARATE experience, not squeezed desktop.

### What Users See (Top to Bottom)

**Header:**
[Describe exactly what's in the header - title, actions, etc.]

**Hero Section (The FIRST thing users see):**
[Describe the most important element in detail:
- What is it? (number, chart, status?)
- How big is it? (give relative sizes)
- Why is this the hero? (explain the user need it answers)]

**Section 2: [Name]**
[Describe this section - what it contains, why it's here]

**Section 3: [Name]**
[Continue for each section]

**Bottom Navigation / Action:**
[What's at the bottom? Fixed action button? Nav tabs? Nothing?]

### What is HIDDEN on Mobile
[List things that are NOT shown on mobile - be explicit]

### Touch Targets
[Any specific notes about button sizes, tap areas?]

---

## 5. Desktop Layout

### Overall Structure
[Describe the layout: single column? Two columns? Sidebar?
How is the horizontal space used meaningfully?]

### Column Layout
[If multi-column, describe what goes where:
- Left column (X%): ...
- Right column (X%): ...]

### What Appears on Hover
[What extra information is revealed when hovering over elements?]

---

## 6. Components

### Hero KPI
The MOST important metric that users see first.

- **Title:** [Name]
- **Data source:** [Which app to query]
- **Calculation:** [How to calculate: sum, count, latest, etc.]
- **Display:** [How it looks - large number? With icon? Progress ring?]
- **Context shown:** [What comparison? Goal progress? Trend?]
- **Why this is the hero:** [Explain why this matters most to users]

### Secondary KPIs
[For each secondary KPI:]

**[KPI Name]**
- Source: [App]
- Calculation: [How]
- Format: [number/currency/percent]
- Display: [Card? Inline? Size?]

### Chart (if applicable)
- **Type:** [line/bar/area - and WHY this type]
- **Title:** [Chart title]
- **What question it answers:** [Why does the user need this chart?]
- **Data source:** [App]
- **X-axis:** [Field, label]
- **Y-axis:** [Field, label]
- **Mobile simplification:** [How is it simplified for small screens?]

### Lists/Tables (if applicable)
[For each list:]

**[Section Name]**
- Purpose: [Why users need this]
- Source: [App]
- Fields shown: [Which fields]
- Mobile style: [cards/simple list]
- Desktop style: [table/cards]
- Sort: [By what field]
- Limit: [How many items]

### Primary Action Button (REQUIRED!)

**⚠️ Every dashboard MUST have a primary action.** This is NOT a read-only view!

Users need to DO things from the dashboard, not just look at data. The most common action should be one tap/click away.

Think about what action users perform most often:
- Adding a new record (workout, meal, expense, etc.)
- Logging something (weight, progress, status)
- Starting a process (timer, session, etc.)

**This section is REQUIRED - do not skip it or write "None"!**

- **Label:** [Action-oriented text, e.g. "Workout starten", "Mahlzeit hinzufügen"]
- **Action:** [add_record | navigate - specify which]
- **Target app:** [Which Living Apps app receives the data]
- **What data:** [What fields will the form contain]
- **Mobile position:** [bottom_fixed (recommended) | header | fab]
- **Desktop position:** [header | sidebar | inline]
- **Why this action:** [Why is this the most important thing users do?]

The implementation skill knows how to create forms that send data to Living Apps API.

---

## 7. Visual Details

### Border Radius
[sharp (4px) / rounded (8px) / pill (16px+)]

### Shadows
[none / subtle / elevated - describe the shadow style]

### Spacing
[compact / normal / spacious - how much breathing room?]

### Animations
- **Page load:** [none / fade / stagger]
- **Hover effects:** [What happens on hover?]
- **Tap feedback:** [What happens on tap?]

---

## 8. CSS Variables (Copy Exactly!)

The implementer MUST copy these values exactly into `src/index.css`:

```css
:root {
  --background: hsl(...);
  --foreground: hsl(...);
  --card: hsl(...);
  --card-foreground: hsl(...);
  --popover: hsl(...);
  --popover-foreground: hsl(...);
  --primary: hsl(...);
  --primary-foreground: hsl(...);
  --secondary: hsl(...);
  --secondary-foreground: hsl(...);
  --muted: hsl(...);
  --muted-foreground: hsl(...);
  --accent: hsl(...);
  --accent-foreground: hsl(...);
  --destructive: hsl(...);
  --border: hsl(...);
  --input: hsl(...);
  --ring: hsl(...);
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
```

---

## ⚠️ How Colors Are Applied (Critical!)

Your colors are mapped to CSS variables. The implementation agent uses them directly.

**Color Mapping:**

| Your design_brief color | CSS Variable |
|-------------------------|--------------|
| `background` | `--background` |
| `foreground` | `--foreground` |
| `card` | `--card` |
| `card_foreground` | `--card-foreground` |
| `primary` | `--primary` |
| `primary_foreground` | `--primary-foreground` |
| `accent` | `--accent` |
| `muted` | `--muted` |
| `muted_foreground` | `--muted-foreground` |
| `border` | `--border` |
| `negative` | `--destructive` |

**Light Theme Contrast Rules:**
- `foreground` must be dark (readable on light backgrounds)
- `card` can be white or slightly off-white
- `card_foreground` must be dark
- `primary` needs sufficient contrast for buttons

**All colors MUST be complete hsl() functions:**
```
"background": "hsl(40 20% 98%)"   // ✅ Complete function
"background": "40 20% 98%"        // ❌ Will break!
```

---

## Quality Checklist

Before finalizing design_brief.md:

### Distinctiveness
- [ ] Would a designer recognize this as intentionally designed (not default)?
- [ ] Is there at least ONE memorable visual detail?
- [ ] Is the font choice appropriate and NOT from forbidden list?
- [ ] Does the color accent feel considered, not generic?

### Layout & UX
- [ ] Is there ONE clear hero element?
- [ ] Is mobile designed FOR mobile (not just smaller)?
- [ ] Does desktop use horizontal space meaningfully?
- [ ] Would this get featured in the App Store?

### Information
- [ ] Is the visual hierarchy clear?
- [ ] Are only essential KPIs shown?
- [ ] Can anything be removed?

### Clarity
- [ ] Is every section detailed enough that someone else could implement it?
- [ ] Are there WHY explanations for major decisions?
- [ ] Are the CSS variables complete and ready to copy?

### Technical
- [ ] Are all colors complete hsl() functions?
- [ ] Is contrast sufficient for readability?
- [ ] Are all required colors defined?

---

## Remember

1. **Write for the implementer** - They will follow your words exactly
2. **Explain WHY** - Context helps them understand intent
3. **Be specific** - "Large number" is vague, "48px bold" is specific
4. **Minimal ≠ Generic** - Minimal can be distinctive
5. **Layout is everything** - 80% of design time on layout
6. **Mobile ≠ Small Desktop** - Separate experiences
7. **One memorable detail** - What makes this special?
8. **App Store quality** - Would Apple feature this?
