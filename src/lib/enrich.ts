import type { EnrichedBestellungen, EnrichedLagerbestand, EnrichedWareneingang } from '@/types/enriched';
import type { Bestellungen, Lagerbestand, Lieferanten, Produkte, Wareneingang } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: string | undefined, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BestellungenMaps {
  lieferantenMap: Map<string, Lieferanten>;
  produkteMap: Map<string, Produkte>;
}

export function enrichBestellungen(
  bestellungen: Bestellungen[],
  maps: BestellungenMaps
): EnrichedBestellungen[] {
  return bestellungen.map(r => ({
    ...r,
    lieferantName: resolveDisplay(r.fields.lieferant, maps.lieferantenMap, 'firmenname'),
    produktName: resolveDisplay(r.fields.produkt, maps.produkteMap, 'produktname'),
  }));
}

interface LagerbestandMaps {
  produkteMap: Map<string, Produkte>;
}

export function enrichLagerbestand(
  lagerbestand: Lagerbestand[],
  maps: LagerbestandMaps
): EnrichedLagerbestand[] {
  return lagerbestand.map(r => ({
    ...r,
    produktName: resolveDisplay(r.fields.produkt, maps.produkteMap, 'produktname'),
  }));
}

interface WareneingangMaps {
  bestellungenMap: Map<string, Bestellungen>;
  produkteMap: Map<string, Produkte>;
  lieferantenMap: Map<string, Lieferanten>;
}

export function enrichWareneingang(
  wareneingang: Wareneingang[],
  maps: WareneingangMaps
): EnrichedWareneingang[] {
  return wareneingang.map(r => ({
    ...r,
    bestellungName: resolveDisplay(r.fields.bestellung, maps.bestellungenMap, 'bestellnummer'),
    produktName: resolveDisplay(r.fields.produkt, maps.produkteMap, 'produktname'),
    lieferantName: resolveDisplay(r.fields.lieferant, maps.lieferantenMap, 'firmenname'),
  }));
}
