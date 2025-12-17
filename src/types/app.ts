// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export interface Lieferanten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    firmenname?: string;
    lieferantennummer?: string;
    ansprechpartner?: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    plz?: string;
    stadt?: string;
    land?: string;
    zahlungsziel?: number;
    lieferzeit?: number;
    bewertung?: 'sehr_gut' | 'gut' | 'befriedigend' | 'ausreichend' | 'mangelhaft';
    notizen?: string;
  };
}

export interface Bestellungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    bestellnummer?: string;
    lieferant?: string; // applookup -> URL zu 'Lieferanten' Record
    produkt?: string; // applookup -> URL zu 'Produkte' Record
    bestellmenge?: number;
    preis_pro_einheit?: number;
    gesamtpreis?: number;
    bestelldatum?: string; // Format: YYYY-MM-DD oder ISO String
    erwartetes_lieferdatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: 'entwurf' | 'bestellt' | 'bestaetigt' | 'teilweise_geliefert' | 'geliefert' | 'storniert';
    lieferantenbestellung?: string;
    notizen?: string;
  };
}

export interface Lagerverwaltungssystem {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategorie?: string;
    hintergrund_farbe_1_hell?: string;
    hintergrund_bild_hell?: string;
    app_id?: string;
    icon?: string;
    parameter_identifizierer?: string;
    target?: string;
    breite_tablet?: number;
    hoehe_widescreen?: number;
    hoehe_fullhd?: number;
    text_farbe_hell?: string;
    hintergrund_bild_dunkel?: string;
    uebergeordnetes_panel?: string; // applookup -> URL zu 'Lagerverwaltungssystem' Record
    dummy?: string;
    beschriftung?: string;
    reihenfolge?: number;
    hoehe_tablet?: number;
    spalte_widescreen?: number;
    beschreibung?: string;
    hoehe_desktop?: number;
    breite_widescreen?: number;
    breite_fullhd?: number;
    hintergrund?: 'einfache_farbe' | 'linearer_farbverlauf' | 'bild' | 'kreisfoermiger_farbverlauf';
    text_farbe_dunkel?: string;
    hintergrund_farbe_1_dunkel?: string;
    hintergrund_farbe_2_dunkel?: string;
    css_class?: string;
    spalte_mobil2?: number;
    parameter_typ?: 'number' | 'string' | 'html' | 'color' | 'date' | 'option_1' | 'option_2' | 'datetime' | 'datedelta' | 'datetimedelta' | 'monthdelta' | 'upload' | 'control';
    parameter_ist_zuruecksetzbar?: boolean;
    parameter_ist_pflichtfeld?: boolean;
    parameter_optionen?: string;
    template?: string;
    title?: string;
    url?: string;
    breite_mobil2?: number;
    hoehe_mobil2?: number;
    spalte_tablet?: number;
    breite_tablet2?: number;
    spalte_desktop?: number;
    spalte_fullhd?: number;
    darstellung?: 'titel' | 'karte';
    hintergrund_farbe_2_hell?: string;
  };
}

export interface Produkte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    produktname?: string;
    artikelnummer?: string;
    beschreibung?: string;
    kategorie?: 'elektronik' | 'lebensmittel' | 'kleidung' | 'moebel' | 'werkzeuge' | 'buero' | 'spielwaren' | 'sonstiges';
    einkaufspreis?: number;
    verkaufspreis?: number;
    mindestbestand?: number;
    einheit?: 'stueck' | 'kg' | 'g' | 'liter' | 'meter' | 'karton' | 'palette';
    barcode?: string;
    bild_url?: string;
    aktiv?: 'aktiv' | 'inaktiv' | 'auslaufend';
  };
}

export interface Lagerbestand {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    produkt?: string; // applookup -> URL zu 'Produkte' Record
    lagerort?: 'regal_a1' | 'regal_a2' | 'regal_b1' | 'regal_b2' | 'hochregal_1' | 'kuehllager' | 'aussenlager' | 'retoure';
    menge?: number;
    reserviert?: number;
    verfuegbar?: number;
    letzte_inventur?: string; // Format: YYYY-MM-DD oder ISO String
    notizen?: string;
  };
}

export interface Wareneingang {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    bestellung?: string; // applookup -> URL zu 'Bestellungen' Record
    produkt?: string; // applookup -> URL zu 'Produkte' Record
    lieferant?: string; // applookup -> URL zu 'Lieferanten' Record
    lieferdatum?: string; // Format: YYYY-MM-DD oder ISO String
    gelieferte_menge?: number;
    lagerort?: 'regal_a1' | 'regal_a2' | 'regal_b1' | 'regal_b2' | 'hochregal_1' | 'kuehllager' | 'aussenlager' | 'retoure';
    qualitaetspruefung?: 'bestanden' | 'mit_maengeln' | 'nicht_bestanden' | 'nicht_geprueft';
    abweichungen?: string;
    lieferscheinnummer?: string;
    erfasst_von?: string;
    erfassungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    notizen?: string;
  };
}

export const APP_IDS = {
  LIEFERANTEN: '69131a4ee2d56093dc1c94b0',
  BESTELLUNGEN: '69131a4fedccc6591086c8d9',
  LAGERVERWALTUNGSSYSTEM: '69131a6a186719eb429b3e65',
  PRODUKTE: '69131a49a83d8e2ed62188f0',
  LAGERBESTAND: '69131a4e1dd7e4e32529c8c7',
  WARENEINGANG: '69131a4f29930062bbf5d304',
} as const;

// Helper Types for creating new records
export type CreateLieferanten = Lieferanten['fields'];
export type CreateBestellungen = Bestellungen['fields'];
export type CreateLagerverwaltungssystem = Lagerverwaltungssystem['fields'];
export type CreateProdukte = Produkte['fields'];
export type CreateLagerbestand = Lagerbestand['fields'];
export type CreateWareneingang = Wareneingang['fields'];