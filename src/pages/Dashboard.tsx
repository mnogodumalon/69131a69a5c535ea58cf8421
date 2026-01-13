import { useState, useEffect, useMemo } from 'react';
import type { Produkte, Lagerbestand, Bestellungen, Wareneingang, Lieferanten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Lookup data for Lagerort
const LAGERORT_LABELS: Record<string, string> = {
  regal_a1: 'Regal A1',
  regal_a2: 'Regal A2',
  regal_b1: 'Regal B1',
  regal_b2: 'Regal B2',
  hochregal_1: 'Hochregal 1',
  kuehllager: 'Kühllager',
  aussenlager: 'Außenlager',
  retoure: 'Retoure'
};

// Lookup data for Qualitätsprüfung
const QUALITAET_LABELS: Record<string, string> = {
  bestanden: 'Bestanden',
  mit_maengeln: 'Mit Mängeln',
  nicht_bestanden: 'Nicht bestanden',
  nicht_geprueft: 'Nicht geprüft'
};

// Status labels for orders
const STATUS_LABELS: Record<string, string> = {
  entwurf: 'Entwurf',
  bestellt: 'Bestellt',
  bestaetigt: 'Bestätigt',
  teilweise_geliefert: 'Teilweise geliefert',
  geliefert: 'Geliefert',
  storniert: 'Storniert'
};

interface EnrichedLagerbestand extends Lagerbestand {
  produkt_data?: Produkte;
  deficit?: number;
}

interface EnrichedBestellung extends Bestellungen {
  lieferant_data?: Lieferanten;
}

interface EnrichedWareneingang extends Wareneingang {
  produkt_data?: Produkte;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-80 md:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fehler beim Laden</AlertTitle>
        <AlertDescription className="mt-2">
          {error.message}
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 w-full">
            Erneut versuchen
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function Dashboard() {
  const [produkte, setProdukte] = useState<Produkte[]>([]);
  const [lagerbestand, setLagerbestand] = useState<Lagerbestand[]>([]);
  const [bestellungen, setBestellungen] = useState<Bestellungen[]>([]);
  const [wareneingang, setWareneingang] = useState<Wareneingang[]>([]);
  const [lieferanten, setLieferanten] = useState<Lieferanten[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state for Wareneingang
  const [formData, setFormData] = useState({
    bestellung: '',
    produkt: '',
    lieferant: '',
    lieferdatum: format(new Date(), 'yyyy-MM-dd'),
    gelieferte_menge: '',
    lagerort: '',
    qualitaetspruefung: 'nicht_geprueft',
    lieferscheinnummer: ''
  });

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [p, l, b, w, lief] = await Promise.all([
        LivingAppsService.getProdukte(),
        LivingAppsService.getLagerbestand(),
        LivingAppsService.getBestellungen(),
        LivingAppsService.getWareneingang(),
        LivingAppsService.getLieferanten()
      ]);
      setProdukte(p);
      setLagerbestand(l);
      setBestellungen(b);
      setWareneingang(w);
      setLieferanten(lief);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Ein unbekannter Fehler ist aufgetreten'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Create lookup maps
  const produkteMap = useMemo(() => {
    const map = new Map<string, Produkte>();
    produkte.forEach(p => map.set(p.record_id, p));
    return map;
  }, [produkte]);

  const lieferantenMap = useMemo(() => {
    const map = new Map<string, Lieferanten>();
    lieferanten.forEach(l => map.set(l.record_id, l));
    return map;
  }, [lieferanten]);

  // Enrich Lagerbestand with product data and calculate deficit
  const enrichedLagerbestand: EnrichedLagerbestand[] = useMemo(() => {
    return lagerbestand.map(lb => {
      const produktId = extractRecordId(lb.fields.produkt);
      const produkt_data = produktId ? produkteMap.get(produktId) : undefined;
      const menge = lb.fields.menge ?? 0;
      const mindestbestand = produkt_data?.fields.mindestbestand ?? 0;
      const deficit = mindestbestand > menge ? mindestbestand - menge : 0;
      return { ...lb, produkt_data, deficit };
    });
  }, [lagerbestand, produkteMap]);

  // Critical items (below minimum stock)
  const kritischeArtikel = useMemo(() => {
    return enrichedLagerbestand
      .filter(lb => lb.deficit && lb.deficit > 0)
      .sort((a, b) => (b.deficit ?? 0) - (a.deficit ?? 0));
  }, [enrichedLagerbestand]);

  // Active products count
  const activeProductsCount = useMemo(() => {
    return produkte.filter(p => p.fields.aktiv === 'aktiv').length;
  }, [produkte]);

  // Open orders (bestellt, bestaetigt, teilweise_geliefert)
  const offeneBestellungen = useMemo(() => {
    return bestellungen.filter(b =>
      ['bestellt', 'bestaetigt', 'teilweise_geliefert'].includes(b.fields.status ?? '')
    );
  }, [bestellungen]);

  // Enrich open orders with supplier data
  const enrichedOffeneBestellungen: EnrichedBestellung[] = useMemo(() => {
    return offeneBestellungen.map(b => {
      const lieferantId = extractRecordId(b.fields.lieferant);
      const lieferant_data = lieferantId ? lieferantenMap.get(lieferantId) : undefined;
      return { ...b, lieferant_data };
    });
  }, [offeneBestellungen, lieferantenMap]);

  // Upcoming deliveries (sorted by expected date)
  const anstehendelieferungen = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return enrichedOffeneBestellungen
      .filter(b => b.fields.erwartetes_lieferdatum && b.fields.erwartetes_lieferdatum >= today)
      .sort((a, b) => (a.fields.erwartetes_lieferdatum ?? '').localeCompare(b.fields.erwartetes_lieferdatum ?? ''))
      .slice(0, 5);
  }, [enrichedOffeneBestellungen]);

  // Today's goods receipts
  const today = format(new Date(), 'yyyy-MM-dd');
  const wareneingangHeute = useMemo(() => {
    return wareneingang.filter(w => w.fields.lieferdatum === today);
  }, [wareneingang, today]);

  // Recent goods receipts (enriched)
  const recentWareneingang: EnrichedWareneingang[] = useMemo(() => {
    return wareneingang
      .sort((a, b) => (b.fields.lieferdatum ?? '').localeCompare(a.fields.lieferdatum ?? ''))
      .slice(0, 5)
      .map(w => {
        const produktId = extractRecordId(w.fields.produkt);
        const produkt_data = produktId ? produkteMap.get(produktId) : undefined;
        return { ...w, produkt_data };
      });
  }, [wareneingang, produkteMap]);

  // Chart data: Stock by location
  const stockByLocation = useMemo(() => {
    const groups = new Map<string, number>();
    lagerbestand.forEach(lb => {
      const loc = lb.fields.lagerort ?? 'unbekannt';
      const menge = lb.fields.menge ?? 0;
      groups.set(loc, (groups.get(loc) ?? 0) + menge);
    });
    return Array.from(groups.entries()).map(([name, value]) => ({
      name: LAGERORT_LABELS[name] ?? name,
      value
    }));
  }, [lagerbestand]);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const apiData: Wareneingang['fields'] = {
        lieferdatum: formData.lieferdatum,
        gelieferte_menge: formData.gelieferte_menge ? parseFloat(formData.gelieferte_menge) : undefined,
        lagerort: formData.lagerort as Wareneingang['fields']['lagerort'],
        qualitaetspruefung: formData.qualitaetspruefung as Wareneingang['fields']['qualitaetspruefung'],
        lieferscheinnummer: formData.lieferscheinnummer || undefined
      };

      if (formData.bestellung) {
        apiData.bestellung = createRecordUrl(APP_IDS.BESTELLUNGEN, formData.bestellung);
      }
      if (formData.produkt) {
        apiData.produkt = createRecordUrl(APP_IDS.PRODUKTE, formData.produkt);
      }
      if (formData.lieferant) {
        apiData.lieferant = createRecordUrl(APP_IDS.LIEFERANTEN, formData.lieferant);
      }

      await LivingAppsService.createWareneingangEntry(apiData);
      setDialogOpen(false);
      setFormData({
        bestellung: '',
        produkt: '',
        lieferant: '',
        lieferdatum: format(new Date(), 'yyyy-MM-dd'),
        gelieferte_menge: '',
        lagerort: '',
        qualitaetspruefung: 'nicht_geprueft',
        lieferscheinnummer: ''
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to create Wareneingang:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusBadgeVariant(status: string | undefined): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case 'bestellt':
        return 'secondary';
      case 'bestaetigt':
        return 'default';
      case 'teilweise_geliefert':
        return 'outline';
      default:
        return 'secondary';
    }
  }

  function getQualityIcon(quality: string | undefined) {
    switch (quality) {
      case 'bestanden':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'mit_maengeln':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'nicht_bestanden':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  }

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <h1 className="text-xl font-semibold">Lager</h1>
        </header>

        <main className="p-4 pb-24 space-y-4">
          {/* Alert Banner */}
          {kritischeArtikel.length > 0 && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{kritischeArtikel.length} Artikel unter Mindestbestand</AlertTitle>
            </Alert>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Produkte</span>
                <span className="text-2xl font-bold">{activeProductsCount}</span>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Offen</span>
                <span className="text-2xl font-bold">{offeneBestellungen.length}</span>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Heute</span>
                <span className="text-2xl font-bold">{wareneingangHeute.length}</span>
              </div>
            </Card>
          </div>

          {/* Critical Items */}
          {kritischeArtikel.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Kritische Artikel</h2>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3">
                  {kritischeArtikel.slice(0, 5).map(item => (
                    <Card key={item.record_id} className="w-48 shrink-0 p-4">
                      <div className="space-y-2">
                        <p className="font-medium text-sm truncate">
                          {item.produkt_data?.fields.produktname ?? 'Unbekannt'}
                        </p>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Bestand</span>
                          <span className="font-medium">{item.fields.menge ?? 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Minimum</span>
                          <span>{item.produkt_data?.fields.mindestbestand ?? 0}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-destructive rounded-full"
                            style={{
                              width: `${Math.min(((item.deficit ?? 0) / (item.produkt_data?.fields.mindestbestand ?? 1)) * 100, 100)}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-destructive font-medium">
                          Fehlen: {item.deficit}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </section>
          )}

          {/* Upcoming Deliveries */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Anstehende Lieferungen</h2>
            <Card>
              <div className="divide-y">
                {anstehendelieferungen.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Keine anstehenden Lieferungen
                  </div>
                ) : (
                  anstehendelieferungen.slice(0, 3).map(order => (
                    <div key={order.record_id} className="p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{order.fields.bestellnummer}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.lieferant_data?.fields.firmenname ?? 'Unbekannt'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs">
                          {order.fields.erwartetes_lieferdatum
                            ? format(parseISO(order.fields.erwartetes_lieferdatum), 'dd.MM.', { locale: de })
                            : '-'}
                        </p>
                        <Badge variant={getStatusBadgeVariant(order.fields.status)} className="text-xs">
                          {STATUS_LABELS[order.fields.status ?? ''] ?? order.fields.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </section>

          {/* Recent Receipts */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Letzte Wareneingänge</h2>
            <Card>
              <div className="divide-y">
                {recentWareneingang.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Noch keine Wareneingänge
                  </div>
                ) : (
                  recentWareneingang.map(entry => (
                    <div key={entry.record_id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {getQualityIcon(entry.fields.qualitaetspruefung)}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {entry.produkt_data?.fields.produktname ?? 'Unbekannt'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.fields.gelieferte_menge ?? 0} Stk.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {entry.fields.lieferdatum
                          ? format(parseISO(entry.fields.lieferdatum), 'dd.MM.', { locale: de })
                          : '-'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </section>
        </main>

        {/* Fixed Bottom Action Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-14 text-base" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Wareneingang erfassen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Wareneingang erfassen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="bestellung">Bestellung</Label>
                  <Select value={formData.bestellung} onValueChange={v => setFormData(f => ({ ...f, bestellung: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Bestellung auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {offeneBestellungen.map(b => (
                        <SelectItem key={b.record_id} value={b.record_id}>
                          {b.fields.bestellnummer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="produkt">Produkt *</Label>
                  <Select value={formData.produkt} onValueChange={v => setFormData(f => ({ ...f, produkt: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Produkt auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {produkte.filter(p => p.fields.aktiv === 'aktiv').map(p => (
                        <SelectItem key={p.record_id} value={p.record_id}>
                          {p.fields.produktname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lieferant">Lieferant</Label>
                  <Select value={formData.lieferant} onValueChange={v => setFormData(f => ({ ...f, lieferant: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Lieferant auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {lieferanten.map(l => (
                        <SelectItem key={l.record_id} value={l.record_id}>
                          {l.fields.firmenname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lieferdatum">Lieferdatum *</Label>
                    <Input
                      id="lieferdatum"
                      type="date"
                      value={formData.lieferdatum}
                      onChange={e => setFormData(f => ({ ...f, lieferdatum: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="menge">Menge *</Label>
                    <Input
                      id="menge"
                      type="number"
                      placeholder="0"
                      value={formData.gelieferte_menge}
                      onChange={e => setFormData(f => ({ ...f, gelieferte_menge: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lagerort">Lagerort *</Label>
                  <Select value={formData.lagerort} onValueChange={v => setFormData(f => ({ ...f, lagerort: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Lagerort auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LAGERORT_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualitaet">Qualitätsprüfung</Label>
                  <Select value={formData.qualitaetspruefung} onValueChange={v => setFormData(f => ({ ...f, qualitaetspruefung: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUALITAET_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lieferschein">Lieferscheinnummer</Label>
                  <Input
                    id="lieferschein"
                    placeholder="z.B. LS-2025-001"
                    value={formData.lieferscheinnummer}
                    onChange={e => setFormData(f => ({ ...f, lieferscheinnummer: e.target.value }))}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Wird gespeichert...' : 'Wareneingang speichern'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="mx-auto max-w-7xl px-8 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Lagerverwaltung</h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Wareneingang erfassen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Wareneingang erfassen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="bestellung-d">Bestellung</Label>
                    <Select value={formData.bestellung} onValueChange={v => setFormData(f => ({ ...f, bestellung: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Bestellung auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {offeneBestellungen.map(b => (
                          <SelectItem key={b.record_id} value={b.record_id}>
                            {b.fields.bestellnummer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="produkt-d">Produkt *</Label>
                    <Select value={formData.produkt} onValueChange={v => setFormData(f => ({ ...f, produkt: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Produkt auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {produkte.filter(p => p.fields.aktiv === 'aktiv').map(p => (
                          <SelectItem key={p.record_id} value={p.record_id}>
                            {p.fields.produktname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lieferant-d">Lieferant</Label>
                    <Select value={formData.lieferant} onValueChange={v => setFormData(f => ({ ...f, lieferant: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Lieferant auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lieferanten.map(l => (
                          <SelectItem key={l.record_id} value={l.record_id}>
                            {l.fields.firmenname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lieferdatum-d">Lieferdatum *</Label>
                      <Input
                        id="lieferdatum-d"
                        type="date"
                        value={formData.lieferdatum}
                        onChange={e => setFormData(f => ({ ...f, lieferdatum: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="menge-d">Menge *</Label>
                      <Input
                        id="menge-d"
                        type="number"
                        placeholder="0"
                        value={formData.gelieferte_menge}
                        onChange={e => setFormData(f => ({ ...f, gelieferte_menge: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lagerort-d">Lagerort *</Label>
                    <Select value={formData.lagerort} onValueChange={v => setFormData(f => ({ ...f, lagerort: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Lagerort auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LAGERORT_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qualitaet-d">Qualitätsprüfung</Label>
                    <Select value={formData.qualitaetspruefung} onValueChange={v => setFormData(f => ({ ...f, qualitaetspruefung: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITAET_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lieferschein-d">Lieferscheinnummer</Label>
                    <Input
                      id="lieferschein-d"
                      placeholder="z.B. LS-2025-001"
                      value={formData.lieferscheinnummer}
                      onChange={e => setFormData(f => ({ ...f, lieferscheinnummer: e.target.value }))}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Wird gespeichert...' : 'Wareneingang speichern'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-8 py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {/* Hero KPI: Critical Items */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Kritische Artikel
                </CardTitle>
                <AlertTriangle className={`h-4 w-4 ${kritischeArtikel.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-4xl font-bold ${kritischeArtikel.length > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {kritischeArtikel.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  von {activeProductsCount} Produkten
                </p>
              </CardContent>
            </Card>

            {/* Total Products */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Gesamtprodukte
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{activeProductsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">aktive Artikel</p>
              </CardContent>
            </Card>

            {/* Open Orders */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Offene Bestellungen
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{offeneBestellungen.length}</div>
                <p className="text-xs text-muted-foreground mt-1">ausstehend</p>
              </CardContent>
            </Card>

            {/* Today's Receipts */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wareneingänge heute
                </CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{wareneingangHeute.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(), 'dd. MMM yyyy', { locale: de })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content: Two columns */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left column (2/3) */}
            <div className="col-span-2 space-y-6">
              {/* Low Stock Alert Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Kritische Artikel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {kritischeArtikel.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>Alle Artikel sind ausreichend bevorratet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produkt</TableHead>
                          <TableHead>Artikelnr.</TableHead>
                          <TableHead className="text-right">Bestand</TableHead>
                          <TableHead className="text-right">Minimum</TableHead>
                          <TableHead className="text-right">Fehlmenge</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kritischeArtikel.slice(0, 10).map(item => (
                          <TableRow key={item.record_id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {item.produkt_data?.fields.produktname ?? 'Unbekannt'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.produkt_data?.fields.artikelnummer ?? '-'}
                            </TableCell>
                            <TableCell className="text-right">{item.fields.menge ?? 0}</TableCell>
                            <TableCell className="text-right">
                              {item.produkt_data?.fields.mindestbestand ?? 0}
                            </TableCell>
                            <TableCell className="text-right text-destructive font-medium">
                              -{item.deficit}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Chart: Stock by Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Bestand nach Lagerort</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockByLocation} layout="vertical" margin={{ left: 80 }}>
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(215 15% 47%)" />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          stroke="hsl(215 15% 47%)"
                          width={75}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(0 0% 100%)',
                            border: '1px solid hsl(210 15% 90%)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [value, 'Bestand']}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {stockByLocation.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={`hsl(173 58% ${39 + index * 5}%)`}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column (1/3) */}
            <div className="space-y-6">
              {/* Upcoming Deliveries */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Anstehende Lieferungen</CardTitle>
                </CardHeader>
                <CardContent>
                  {anstehendelieferungen.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Keine anstehenden Lieferungen
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {anstehendelieferungen.map(order => (
                        <div
                          key={order.record_id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{order.fields.bestellnummer}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {order.lieferant_data?.fields.firmenname ?? 'Unbekannt'}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-sm font-medium">
                              {order.fields.erwartetes_lieferdatum
                                ? format(parseISO(order.fields.erwartetes_lieferdatum), 'dd.MM.', { locale: de })
                                : '-'}
                            </p>
                            <Badge variant={getStatusBadgeVariant(order.fields.status)} className="text-xs">
                              {STATUS_LABELS[order.fields.status ?? ''] ?? order.fields.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Receipts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Letzte Wareneingänge</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentWareneingang.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Noch keine Wareneingänge
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recentWareneingang.map(entry => (
                        <div
                          key={entry.record_id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          {getQualityIcon(entry.fields.qualitaetspruefung)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {entry.produkt_data?.fields.produktname ?? 'Unbekannt'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.fields.gelieferte_menge ?? 0} Stk.
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {entry.fields.lieferdatum
                              ? format(parseISO(entry.fields.lieferdatum), 'dd.MM.', { locale: de })
                              : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
