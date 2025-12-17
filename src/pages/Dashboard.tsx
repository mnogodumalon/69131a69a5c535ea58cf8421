import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type {
  Produkte,
  Lagerbestand,
  Bestellungen,
  Wareneingang,
  Lieferanten
} from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  TrendingDown,
  ShoppingCart,
  TruckIcon,
  AlertTriangle,
  CheckCircle,
  PackageOpen,
  PlusCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';

// Lookup-Daten für Lagerorte (aus Metadaten)
const LAGERORTE = {
  regal_a1: 'Regal A1',
  regal_a2: 'Regal A2',
  regal_b1: 'Regal B1',
  regal_b2: 'Regal B2',
  hochregal_1: 'Hochregal 1',
  kuehllager: 'Kühllager',
  aussenlager: 'Außenlager',
  retoure: 'Retoure'
} as const;

const QUALITAET = {
  bestanden: 'Bestanden ✅',
  mit_maengeln: 'Mit Mängeln ⚠️',
  nicht_bestanden: 'Nicht bestanden ❌',
  nicht_geprueft: 'Nicht geprüft'
} as const;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State für alle Daten
  const [produkte, setProdukte] = useState<Produkte[]>([]);
  const [lagerbestand, setLagerbestand] = useState<Lagerbestand[]>([]);
  const [bestellungen, setBestellungen] = useState<Bestellungen[]>([]);
  const [wareneingang, setWareneingang] = useState<Wareneingang[]>([]);
  const [lieferanten, setLieferanten] = useState<Lieferanten[]>([]);

  // State für Wareneingang-Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    produkt: '',
    lieferant: '',
    bestellung: '',
    lieferdatum: new Date().toISOString().split('T')[0],
    gelieferte_menge: '',
    lagerort: '',
    qualitaetspruefung: 'nicht_geprueft' as keyof typeof QUALITAET,
    lieferscheinnummer: '',
    abweichungen: '',
    erfasst_von: '',
    notizen: ''
  });

  // Daten laden
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      setError(null);

      const [
        produkteData,
        lagerbestandData,
        bestellungenData,
        wareneingangData,
        lieferantenData
      ] = await Promise.all([
        LivingAppsService.getProdukte(),
        LivingAppsService.getLagerbestand(),
        LivingAppsService.getBestellungen(),
        LivingAppsService.getWareneingang(),
        LivingAppsService.getLieferanten()
      ]);

      setProdukte(produkteData);
      setLagerbestand(lagerbestandData);
      setBestellungen(bestellungenData);
      setWareneingang(wareneingangData);
      setLieferanten(lieferantenData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }

  // KPI Berechnungen
  const getKPIs = () => {
    // Produkte unter Mindestbestand
    const produkteUnterMindestbestand = lagerbestand.filter(bestand => {
      const produktId = extractRecordId(bestand.fields.produkt);
      if (!produktId) return false;

      const produkt = produkte.find(p => p.record_id === produktId);
      if (!produkt?.fields.mindestbestand) return false;

      const verfuegbar = bestand.fields.verfuegbar ?? bestand.fields.menge ?? 0;
      return verfuegbar < produkt.fields.mindestbestand;
    });

    // Offene Bestellungen
    const offeneBestellungen = bestellungen.filter(b =>
      b.fields.status !== 'geliefert' && b.fields.status !== 'storniert'
    );

    // Wareneingänge heute
    const heute = new Date().toISOString().split('T')[0];
    const wareneingangeHeute = wareneingang.filter(w =>
      w.fields.lieferdatum === heute
    );

    // Gesamtwert Lagerbestand
    let gesamtwert = 0;
    lagerbestand.forEach(bestand => {
      const produktId = extractRecordId(bestand.fields.produkt);
      if (!produktId) return;

      const produkt = produkte.find(p => p.record_id === produktId);
      if (!produkt?.fields.einkaufspreis) return;

      const menge = bestand.fields.menge ?? 0;
      gesamtwert += menge * produkt.fields.einkaufspreis;
    });

    return {
      produkteUnterMindestbestand,
      offeneBestellungen,
      wareneingangeHeute,
      gesamtwert
    };
  };

  const kpis = getKPIs();

  // Produkte nach Kategorie gruppieren
  const getProdukteNachKategorie = () => {
    const kategorien: Record<string, number> = {};

    produkte.forEach(produkt => {
      if (produkt.fields.kategorie) {
        kategorien[produkt.fields.kategorie] = (kategorien[produkt.fields.kategorie] || 0) + 1;
      }
    });

    return kategorien;
  };

  // Lagerbestand nach Lagerort
  const getBestandNachLagerort = () => {
    const lagerorte: Record<string, number> = {};

    lagerbestand.forEach(bestand => {
      if (bestand.fields.lagerort) {
        lagerorte[bestand.fields.lagerort] = (lagerorte[bestand.fields.lagerort] || 0) + (bestand.fields.menge ?? 0);
      }
    });

    return lagerorte;
  };

  // Wareneingang erstellen
  async function handleWareneingangErstellen(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.produkt || !formData.gelieferte_menge || !formData.lagerort) {
      toast.error('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    try {
      setSubmitting(true);

      // Felder für API vorbereiten
      const fields: Wareneingang['fields'] = {
        produkt: createRecordUrl(APP_IDS.PRODUKTE, formData.produkt),
        gelieferte_menge: parseFloat(formData.gelieferte_menge),
        lagerort: formData.lagerort as Wareneingang['fields']['lagerort'],
        qualitaetspruefung: formData.qualitaetspruefung,
        lieferdatum: formData.lieferdatum,
        erfassungsdatum: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
      };

      // Optional: Lieferant
      if (formData.lieferant) {
        fields.lieferant = createRecordUrl(APP_IDS.LIEFERANTEN, formData.lieferant);
      }

      // Optional: Bestellung
      if (formData.bestellung) {
        fields.bestellung = createRecordUrl(APP_IDS.BESTELLUNGEN, formData.bestellung);
      }

      // Optional: weitere Felder
      if (formData.lieferscheinnummer) fields.lieferscheinnummer = formData.lieferscheinnummer;
      if (formData.abweichungen) fields.abweichungen = formData.abweichungen;
      if (formData.erfasst_von) fields.erfasst_von = formData.erfasst_von;
      if (formData.notizen) fields.notizen = formData.notizen;

      await LivingAppsService.createWareneingangEntry(fields);

      toast.success('Wareneingang erfolgreich erfasst');
      setDialogOpen(false);

      // Formular zurücksetzen
      setFormData({
        produkt: '',
        lieferant: '',
        bestellung: '',
        lieferdatum: new Date().toISOString().split('T')[0],
        gelieferte_menge: '',
        lagerort: '',
        qualitaetspruefung: 'nicht_geprueft',
        lieferscheinnummer: '',
        abweichungen: '',
        erfasst_von: '',
        notizen: ''
      });

      // Daten neu laden
      await loadAllData();
    } catch (err) {
      toast.error('Fehler beim Erstellen des Wareneingangs: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const produkteNachKategorie = getProdukteNachKategorie();
  const bestandNachLagerort = getBestandNachLagerort();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header mit Action-Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lagerverwaltungssystem</h1>
          <p className="text-muted-foreground">Übersicht über Bestand, Bestellungen und Wareneingänge</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Wareneingang erfassen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neuer Wareneingang</DialogTitle>
              <DialogDescription>
                Erfasse einen neuen Wareneingang im Lagerverwaltungssystem
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleWareneingangErstellen} className="space-y-4">
              {/* Produkt (Pflichtfeld) */}
              <div className="space-y-2">
                <Label htmlFor="produkt">Produkt *</Label>
                <Select
                  value={formData.produkt}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, produkt: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Produkt auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {produkte.map(p => (
                      <SelectItem key={p.record_id} value={p.record_id}>
                        {p.fields.produktname || p.fields.artikelnummer || 'Unbenannt'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lieferant (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="lieferant">Lieferant</Label>
                <Select
                  value={formData.lieferant}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, lieferant: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lieferant auswählen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kein Lieferant</SelectItem>
                    {lieferanten.map(l => (
                      <SelectItem key={l.record_id} value={l.record_id}>
                        {l.fields.firmenname || l.fields.lieferantennummer || 'Unbenannt'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bestellung (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="bestellung">Bestellung</Label>
                <Select
                  value={formData.bestellung}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, bestellung: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bestellung auswählen (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keine Bestellung</SelectItem>
                    {bestellungen.map(b => (
                      <SelectItem key={b.record_id} value={b.record_id}>
                        {b.fields.bestellnummer || `Bestellung vom ${b.fields.bestelldatum}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gelieferte Menge (Pflichtfeld) */}
              <div className="space-y-2">
                <Label htmlFor="gelieferte_menge">Gelieferte Menge *</Label>
                <Input
                  id="gelieferte_menge"
                  type="number"
                  step="0.01"
                  value={formData.gelieferte_menge}
                  onChange={(e) => setFormData(prev => ({ ...prev, gelieferte_menge: e.target.value }))}
                  required
                />
              </div>

              {/* Lieferdatum */}
              <div className="space-y-2">
                <Label htmlFor="lieferdatum">Lieferdatum</Label>
                <Input
                  id="lieferdatum"
                  type="date"
                  value={formData.lieferdatum}
                  onChange={(e) => setFormData(prev => ({ ...prev, lieferdatum: e.target.value }))}
                />
              </div>

              {/* Lagerort (Pflichtfeld) */}
              <div className="space-y-2">
                <Label htmlFor="lagerort">Lagerort *</Label>
                <Select
                  value={formData.lagerort}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, lagerort: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lagerort auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LAGERORTE).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Qualitätsprüfung */}
              <div className="space-y-2">
                <Label htmlFor="qualitaetspruefung">Qualitätsprüfung</Label>
                <Select
                  value={formData.qualitaetspruefung}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, qualitaetspruefung: value as keyof typeof QUALITAET }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUALITAET).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lieferscheinnummer */}
              <div className="space-y-2">
                <Label htmlFor="lieferscheinnummer">Lieferscheinnummer</Label>
                <Input
                  id="lieferscheinnummer"
                  value={formData.lieferscheinnummer}
                  onChange={(e) => setFormData(prev => ({ ...prev, lieferscheinnummer: e.target.value }))}
                />
              </div>

              {/* Erfasst von */}
              <div className="space-y-2">
                <Label htmlFor="erfasst_von">Erfasst von</Label>
                <Input
                  id="erfasst_von"
                  value={formData.erfasst_von}
                  onChange={(e) => setFormData(prev => ({ ...prev, erfasst_von: e.target.value }))}
                  placeholder="Ihr Name"
                />
              </div>

              {/* Abweichungen */}
              <div className="space-y-2">
                <Label htmlFor="abweichungen">Abweichungen</Label>
                <Textarea
                  id="abweichungen"
                  value={formData.abweichungen}
                  onChange={(e) => setFormData(prev => ({ ...prev, abweichungen: e.target.value }))}
                  placeholder="Beschreiben Sie Abweichungen von der Bestellung"
                />
              </div>

              {/* Notizen */}
              <div className="space-y-2">
                <Label htmlFor="notizen">Notizen</Label>
                <Textarea
                  id="notizen"
                  value={formData.notizen}
                  onChange={(e) => setFormData(prev => ({ ...prev, notizen: e.target.value }))}
                  placeholder="Zusätzliche Notizen"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Erstelle...' : 'Wareneingang erfassen'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Produkte unter Mindestbestand */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unter Mindestbestand</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.produkteUnterMindestbestand.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Produkte benötigen Nachbestellung
            </p>
            {kpis.produkteUnterMindestbestand.length > 0 && (
              <Badge variant="destructive" className="mt-2">Aktion erforderlich</Badge>
            )}
          </CardContent>
        </Card>

        {/* Offene Bestellungen */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Bestellungen</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.offeneBestellungen.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Bestellungen in Bearbeitung
            </p>
          </CardContent>
        </Card>

        {/* Wareneingänge heute */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wareneingänge heute</CardTitle>
            <TruckIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.wareneingangeHeute.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Lieferungen erfasst
            </p>
          </CardContent>
        </Card>

        {/* Gesamtwert Lagerbestand */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lagerwert</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR'
              }).format(kpis.gesamtwert)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gesamtwert aller Bestände
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Produkte unter Mindestbestand - Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Produkte unter Mindestbestand
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.produkteUnterMindestbestand.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Alle Produkte haben ausreichend Bestand
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {kpis.produkteUnterMindestbestand.slice(0, 5).map(bestand => {
                  const produktId = extractRecordId(bestand.fields.produkt);
                  const produkt = produktId ? produkte.find(p => p.record_id === produktId) : null;
                  const verfuegbar = bestand.fields.verfuegbar ?? bestand.fields.menge ?? 0;
                  const mindestbestand = produkt?.fields.mindestbestand ?? 0;

                  return (
                    <div key={bestand.record_id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{produkt?.fields.produktname || 'Unbekannt'}</p>
                        <p className="text-sm text-muted-foreground">
                          Artikel: {produkt?.fields.artikelnummer || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-orange-600">
                          {verfuegbar} / {mindestbestand}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {bestand.fields.lagerort ? LAGERORTE[bestand.fields.lagerort as keyof typeof LAGERORTE] : 'N/A'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {kpis.produkteUnterMindestbestand.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    + {kpis.produkteUnterMindestbestand.length - 5} weitere
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offene Bestellungen - Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Offene Bestellungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.offeneBestellungen.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <PackageOpen className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Keine offenen Bestellungen
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {kpis.offeneBestellungen.slice(0, 5).map(bestellung => {
                  const produktId = extractRecordId(bestellung.fields.produkt);
                  const produkt = produktId ? produkte.find(p => p.record_id === produktId) : null;

                  const statusColors = {
                    entwurf: 'bg-gray-100 text-gray-800',
                    bestellt: 'bg-blue-100 text-blue-800',
                    bestaetigt: 'bg-green-100 text-green-800',
                    teilweise_geliefert: 'bg-yellow-100 text-yellow-800',
                  } as const;

                  const statusColor = bestellung.fields.status && bestellung.fields.status in statusColors
                    ? statusColors[bestellung.fields.status as keyof typeof statusColors]
                    : 'bg-gray-100 text-gray-800';

                  return (
                    <div key={bestellung.record_id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{bestellung.fields.bestellnummer || 'Ohne Nummer'}</p>
                        <p className="text-sm text-muted-foreground">
                          {produkt?.fields.produktname || 'Unbekanntes Produkt'}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge className={statusColor}>
                          {bestellung.fields.status || 'Unbekannt'}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          Lieferung: {bestellung.fields.erwartetes_lieferdatum || 'N/A'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {kpis.offeneBestellungen.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    + {kpis.offeneBestellungen.length - 5} weitere
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Produkte nach Kategorie */}
        <Card>
          <CardHeader>
            <CardTitle>Produkte nach Kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(produkteNachKategorie).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Keine Produkte vorhanden
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(produkteNachKategorie)
                  .sort((a, b) => b[1] - a[1])
                  .map(([kategorie, anzahl]) => {
                    const kategorieLabels: Record<string, string> = {
                      elektronik: 'Elektronik',
                      lebensmittel: 'Lebensmittel',
                      kleidung: 'Kleidung',
                      moebel: 'Möbel',
                      werkzeuge: 'Werkzeuge',
                      buero: 'Bürobedarf',
                      spielwaren: 'Spielwaren',
                      sonstiges: 'Sonstiges'
                    };

                    return (
                      <div key={kategorie} className="flex items-center justify-between">
                        <span className="text-sm">{kategorieLabels[kategorie] || kategorie}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${(anzahl / produkte.length) * 100}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{anzahl}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bestand nach Lagerort */}
        <Card>
          <CardHeader>
            <CardTitle>Bestand nach Lagerort</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(bestandNachLagerort).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Kein Lagerbestand vorhanden
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(bestandNachLagerort)
                  .sort((a, b) => b[1] - a[1])
                  .map(([lagerort, menge]) => {
                    const maxMenge = Math.max(...Object.values(bestandNachLagerort));

                    return (
                      <div key={lagerort} className="flex items-center justify-between">
                        <span className="text-sm">{LAGERORTE[lagerort as keyof typeof LAGERORTE]}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{
                                width: `${(menge / maxMenge) * 100}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-16 text-right">
                            {menge.toLocaleString('de-DE')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Letzte Wareneingänge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-green-600" />
            Letzte Wareneingänge
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wareneingang.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TruckIcon className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Noch keine Wareneingänge erfasst
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {wareneingang
                .sort((a, b) => {
                  const dateA = new Date(a.fields.erfassungsdatum || a.createdat);
                  const dateB = new Date(b.fields.erfassungsdatum || b.createdat);
                  return dateB.getTime() - dateA.getTime();
                })
                .slice(0, 8)
                .map(eingang => {
                  const produktId = extractRecordId(eingang.fields.produkt);
                  const produkt = produktId ? produkte.find(p => p.record_id === produktId) : null;

                  const lieferantId = extractRecordId(eingang.fields.lieferant);
                  const lieferant = lieferantId ? lieferanten.find(l => l.record_id === lieferantId) : null;

                  return (
                    <div key={eingang.record_id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{produkt?.fields.produktname || 'Unbekanntes Produkt'}</p>
                        <p className="text-sm text-muted-foreground">
                          {lieferant?.fields.firmenname || 'Unbekannter Lieferant'} •
                          {eingang.fields.lagerort ? ` ${LAGERORTE[eingang.fields.lagerort as keyof typeof LAGERORTE]}` : ' N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {eingang.fields.gelieferte_menge || 0} Einheiten
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {eingang.fields.lieferdatum || 'N/A'}
                        </p>
                        {eingang.fields.qualitaetspruefung && (
                          <Badge
                            variant="outline"
                            className="mt-1 text-xs"
                          >
                            {QUALITAET[eingang.fields.qualitaetspruefung as keyof typeof QUALITAET]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
