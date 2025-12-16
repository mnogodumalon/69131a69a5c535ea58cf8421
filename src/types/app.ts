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
    bewertung?: string;
    notizen?: string;
  };
}

export interface Bestellungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    bestellnummer?: string;
    lieferant?: string;
    produkt?: string;
    bestellmenge?: number;
    preis_pro_einheit?: number;
    gesamtpreis?: number;
    bestelldatum?: string; // Format: YYYY-MM-DD oder ISO String
    erwartetes_lieferdatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: string;
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
    kategorie?: string;
    einkaufspreis?: number;
    verkaufspreis?: number;
    mindestbestand?: number;
    einheit?: string;
    barcode?: string;
    bild_url?: string;
    aktiv?: string;
  };
}

export interface Lagerbestand {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    produkt?: string;
    lagerort?: string;
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
    bestellung?: string;
    produkt?: string;
    lieferant?: string;
    lieferdatum?: string; // Format: YYYY-MM-DD oder ISO String
    gelieferte_menge?: number;
    lagerort?: string;
    qualitaetspruefung?: string;
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