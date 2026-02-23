import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Lieferanten, Bestellungen, Produkte, Lagerbestand, Wareneingang } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [lieferanten, setLieferanten] = useState<Lieferanten[]>([]);
  const [bestellungen, setBestellungen] = useState<Bestellungen[]>([]);
  const [produkte, setProdukte] = useState<Produkte[]>([]);
  const [lagerbestand, setLagerbestand] = useState<Lagerbestand[]>([]);
  const [wareneingang, setWareneingang] = useState<Wareneingang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [lieferantenData, bestellungenData, produkteData, lagerbestandData, wareneingangData] = await Promise.all([
        LivingAppsService.getLieferanten(),
        LivingAppsService.getBestellungen(),
        LivingAppsService.getProdukte(),
        LivingAppsService.getLagerbestand(),
        LivingAppsService.getWareneingang(),
      ]);
      setLieferanten(lieferantenData);
      setBestellungen(bestellungenData);
      setProdukte(produkteData);
      setLagerbestand(lagerbestandData);
      setWareneingang(wareneingangData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const lieferantenMap = useMemo(() => {
    const m = new Map<string, Lieferanten>();
    lieferanten.forEach(r => m.set(r.record_id, r));
    return m;
  }, [lieferanten]);

  const bestellungenMap = useMemo(() => {
    const m = new Map<string, Bestellungen>();
    bestellungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [bestellungen]);

  const produkteMap = useMemo(() => {
    const m = new Map<string, Produkte>();
    produkte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [produkte]);

  return { lieferanten, setLieferanten, bestellungen, setBestellungen, produkte, setProdukte, lagerbestand, setLagerbestand, wareneingang, setWareneingang, loading, error, fetchAll, lieferantenMap, bestellungenMap, produkteMap };
}