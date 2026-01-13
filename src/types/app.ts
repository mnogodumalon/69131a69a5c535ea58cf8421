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
  PRODUKTE: '69131a49a83d8e2ed62188f0',
  LAGERBESTAND: '69131a4e1dd7e4e32529c8c7',
  WARENEINGANG: '69131a4f29930062bbf5d304',
} as const;

// Helper Types for creating new records
export type CreateLieferanten = Lieferanten['fields'];
export type CreateBestellungen = Bestellungen['fields'];
export type CreateProdukte = Produkte['fields'];
export type CreateLagerbestand = Lagerbestand['fields'];
export type CreateWareneingang = Wareneingang['fields'];