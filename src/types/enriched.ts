import type { Bestellungen, Lagerbestand, Wareneingang } from './app';

export type EnrichedBestellungen = Bestellungen & {
  lieferantName: string;
  produktName: string;
};

export type EnrichedLagerbestand = Lagerbestand & {
  produktName: string;
};

export type EnrichedWareneingang = Wareneingang & {
  bestellungName: string;
  produktName: string;
  lieferantName: string;
};
