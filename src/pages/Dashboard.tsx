import { useEffect, useState } from 'react';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Produkte, Lagerbestand, Bestellungen, Wareneingang, Lieferanten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  PackageOpen
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createRecordUrl } from '@/services/livingAppsService';

interface DashboardData {
  produkte: Produkte[];
  lagerbestand: Lagerbestand[];
  bestellungen: Bestellungen[];
  wareneingang: Wareneingang[];
  lieferanten: Lieferanten[];
}

// Lookup-Daten für Anzeigewerte
const KATEGORIE_LABELS: Record<string, string> = {
  elektronik: 'Elektronik',
  lebensmittel: 'Lebensmittel',
  kleidung: 'Kleidung',
  moebel: 'Möbel',
  werkzeuge: 'Werkzeuge',
  buero: 'Bürobedarf',
  spielwaren: 'Spielwaren',
  sonstiges: 'Sonstiges',
};

const LAGERORT_LABELS: Record<string, string> = {
  regal_a1: 'Regal A1',
  regal_a2: 'Regal A2',
  regal_b1: 'Regal B1',
  regal_b2: 'Regal B2',
  hochregal_1: 'Hochregal 1',
  kuehllager: 'Kühllager',
  aussenlager: 'Außenlager',
  retoure: 'Retoure',
};

const STATUS_LABELS: Record<string, string> = {
  entwurf: 'Entwurf',
  bestellt: 'Bestellt',
  bestaetigt: 'Bestätigt',
  teilweise_geliefert: 'Teilweise geliefert',
  geliefert: 'Geliefert',
  storniert: 'Storniert',
};

const QUALITAET_LABELS: Record<string, string> = {
  bestanden: 'Bestanden ✅',
  mit_maengeln: 'Mit Mängeln ⚠️',
  nicht_bestanden: 'Nicht bestanden ❌',
  nicht_geprueft: 'Nicht geprüft',
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state für Wareneingang-Dialog
  const [formData, setFormData] = useState({
    bestellung: '',
    produkt: '',
    lieferant: '',
    lieferdatum: format(new Date(), 'yyyy-MM-dd'),
    gelieferte_menge: '',
    lagerort: '',
    qualitaetspruefung: 'nicht_geprueft',
    lieferscheinnummer: '',
    abweichungen: '',
    erfasst_von: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [produkte, lagerbestand, bestellungen, wareneingang, lieferanten] = await Promise.all([
        LivingAppsService.getProdukte(),
        LivingAppsService.getLagerbestand(),
        LivingAppsService.getBestellungen(),
        LivingAppsService.getWareneingang(),
        LivingAppsService.getLieferanten(),
      ]);

      setData({ produkte, lagerbestand, bestellungen, wareneingang, lieferanten });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }

  async function handleWareneingangSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Konvertiere applookup-Felder zu vollständigen URLs
      const fields: any = {
        lieferdatum: formData.lieferdatum,
        gelieferte_menge: parseFloat(formData.gelieferte_menge),
        lagerort: formData.lagerort || undefined,
        qualitaetspruefung: formData.qualitaetspruefung,
        lieferscheinnummer: formData.lieferscheinnummer || undefined,
        abweichungen: formData.abweichungen || undefined,
        erfasst_von: formData.erfasst_von || undefined,
        erfassungsdatum: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      };

      // Nur URLs setzen wenn Werte ausgewählt wurden
      if (formData.bestellung) {
        fields.bestellung = createRecordUrl(APP_IDS.BESTELLUNGEN, formData.bestellung);
      }
      if (formData.produkt) {
        fields.produkt = createRecordUrl(APP_IDS.PRODUKTE, formData.produkt);
      }
      if (formData.lieferant) {
        fields.lieferant = createRecordUrl(APP_IDS.LIEFERANTEN, formData.lieferant);
      }

      await LivingAppsService.createWareneingangEntry(fields);

      // Erfolgreich - Dialog schließen und Daten neu laden
      setDialogOpen(false);
      setFormData({
        bestellung: '',
        produkt: '',
        lieferant: '',
        lieferdatum: format(new Date(), 'yyyy-MM-dd'),
        gelieferte_menge: '',
        lagerort: '',
        qualitaetspruefung: 'nicht_geprueft',
        lieferscheinnummer: '',
        abweichungen: '',
        erfasst_von: '',
      });
      await loadData();
    } catch (err) {
      alert('Fehler beim Erstellen des Wareneingangs: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Dashboard wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Fehler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">{error || 'Daten konnten nicht geladen werden'}</p>
            <Button onClick={loadData} className="w-full">
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === BERECHNUNGEN FÜR KPIs ===

  // Gesamtbestandswert
  const gesamtbestandswert = data.lagerbestand.reduce((sum, bestand) => {
    const produktId = extractRecordId(bestand.fields.produkt);
    if (!produktId) return sum;
    const produkt = data.produkte.find(p => p.record_id === produktId);
    const menge = bestand.fields.menge || 0;
    const einkaufspreis = produkt?.fields.einkaufspreis || 0;
    return sum + (menge * einkaufspreis);
  }, 0);

  // Offene Bestellungen (Wert)
  const offeneBestellungen = data.bestellungen.filter(b =>
    b.fields.status && ['bestellt', 'bestaetigt', 'teilweise_geliefert'].includes(b.fields.status)
  );
  const offenerBestellwert = offeneBestellungen.reduce((sum, b) => sum + (b.fields.gesamtpreis || 0), 0);

  // Anzahl aktiver Lieferanten
  const aktiveLieferantenCount = data.lieferanten.length;

  // Kritische Bestände (unter Mindestbestand)
  const kritischeBestaende = data.lagerbestand.filter(bestand => {
    const produktId = extractRecordId(bestand.fields.produkt);
    if (!produktId) return false;
    const produkt = data.produkte.find(p => p.record_id === produktId);
    const menge = bestand.fields.menge || 0;
    const mindestbestand = produkt?.fields.mindestbestand || 0;
    return menge < mindestbestand;
  });

  // === BESTANDSÜBERSICHT NACH KATEGORIE ===
  const bestandNachKategorie: Record<string, { menge: number; wert: number }> = {};

  data.lagerbestand.forEach(bestand => {
    const produktId = extractRecordId(bestand.fields.produkt);
    if (!produktId) return;
    const produkt = data.produkte.find(p => p.record_id === produktId);
    if (!produkt || !produkt.fields.kategorie) return;

    const kategorie = produkt.fields.kategorie;
    const menge = bestand.fields.menge || 0;
    const wert = menge * (produkt.fields.einkaufspreis || 0);

    if (!bestandNachKategorie[kategorie]) {
      bestandNachKategorie[kategorie] = { menge: 0, wert: 0 };
    }
    bestandNachKategorie[kategorie].menge += menge;
    bestandNachKategorie[kategorie].wert += wert;
  });

  const kategorieChartData = Object.entries(bestandNachKategorie).map(([key, value]) => ({
    name: KATEGORIE_LABELS[key] || key,
    wert: Math.round(value.wert),
  }));

  // === BESTELLSTATUS VERTEILUNG ===
  const statusVerteilung: Record<string, number> = {};
  data.bestellungen.forEach(b => {
    const status = b.fields.status || 'entwurf';
    statusVerteilung[status] = (statusVerteilung[status] || 0) + 1;
  });

  const statusChartData = Object.entries(statusVerteilung).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
  }));

  // === LETZTE WARENEINGÄNGE ===
  const letzteWareneingaenge = [...data.wareneingang]
    .sort((a, b) => {
      const dateA = a.fields.lieferdatum || a.createdat;
      const dateB = b.fields.lieferdatum || b.createdat;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header mit Titel und Action Button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Lagerverwaltungssystem
            </h1>
            <p className="text-slate-600">
              Übersicht über Bestände, Bestellungen und Wareneingänge
            </p>
          </div>

          {/* Hauptaktion: Wareneingang erfassen */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg">
                <Plus className="h-5 w-5 mr-2" />
                Wareneingang erfassen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PackageOpen className="h-5 w-5" />
                  Neuer Wareneingang
                </DialogTitle>
                <DialogDescription>
                  Erfassen Sie einen neuen Wareneingang und aktualisieren Sie den Lagerbestand.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleWareneingangSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Produkt (Pflichtfeld) */}
                  <div className="space-y-2">
                    <Label htmlFor="produkt">Produkt *</Label>
                    <Select
                      value={formData.produkt}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, produkt: v }))}
                      required
                    >
                      <SelectTrigger id="produkt">
                        <SelectValue placeholder="Produkt auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.produkte.map(p => (
                          <SelectItem key={p.record_id} value={p.record_id}>
                            {p.fields.produktname || p.fields.artikelnummer || 'Unbenannt'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lieferant */}
                  <div className="space-y-2">
                    <Label htmlFor="lieferant">Lieferant</Label>
                    <Select
                      value={formData.lieferant}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, lieferant: v }))}
                    >
                      <SelectTrigger id="lieferant">
                        <SelectValue placeholder="Lieferant auswählen (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.lieferanten.map(l => (
                          <SelectItem key={l.record_id} value={l.record_id}>
                            {l.fields.firmenname || l.fields.lieferantennummer || 'Unbenannt'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bestellung */}
                  <div className="space-y-2">
                    <Label htmlFor="bestellung">Bestellung</Label>
                    <Select
                      value={formData.bestellung}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, bestellung: v }))}
                    >
                      <SelectTrigger id="bestellung">
                        <SelectValue placeholder="Bestellung auswählen (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.bestellungen.map(b => (
                          <SelectItem key={b.record_id} value={b.record_id}>
                            {b.fields.bestellnummer || b.record_id.slice(-8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lieferdatum */}
                  <div className="space-y-2">
                    <Label htmlFor="lieferdatum">Lieferdatum *</Label>
                    <Input
                      id="lieferdatum"
                      type="date"
                      value={formData.lieferdatum}
                      onChange={(e) => setFormData(prev => ({ ...prev, lieferdatum: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Gelieferte Menge */}
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

                  {/* Lagerort */}
                  <div className="space-y-2">
                    <Label htmlFor="lagerort">Lagerort</Label>
                    <Select
                      value={formData.lagerort}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, lagerort: v }))}
                    >
                      <SelectTrigger id="lagerort">
                        <SelectValue placeholder="Lagerort auswählen (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LAGERORT_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Qualitätsprüfung */}
                  <div className="space-y-2">
                    <Label htmlFor="qualitaetspruefung">Qualitätsprüfung</Label>
                    <Select
                      value={formData.qualitaetspruefung}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, qualitaetspruefung: v }))}
                    >
                      <SelectTrigger id="qualitaetspruefung">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITAET_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lieferscheinnummer */}
                  <div className="space-y-2">
                    <Label htmlFor="lieferscheinnummer">Lieferscheinnummer</Label>
                    <Input
                      id="lieferscheinnummer"
                      type="text"
                      value={formData.lieferscheinnummer}
                      onChange={(e) => setFormData(prev => ({ ...prev, lieferscheinnummer: e.target.value }))}
                    />
                  </div>

                  {/* Erfasst von */}
                  <div className="space-y-2">
                    <Label htmlFor="erfasst_von">Erfasst von</Label>
                    <Input
                      id="erfasst_von"
                      type="text"
                      value={formData.erfasst_von}
                      onChange={(e) => setFormData(prev => ({ ...prev, erfasst_von: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Abweichungen */}
                <div className="space-y-2">
                  <Label htmlFor="abweichungen">Abweichungen / Notizen</Label>
                  <Textarea
                    id="abweichungen"
                    value={formData.abweichungen}
                    onChange={(e) => setFormData(prev => ({ ...prev, abweichungen: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? 'Wird gespeichert...' : 'Wareneingang speichern'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                  >
                    Abbrechen
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Gesamtbestandswert */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Gesamtbestandswert
              </CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {gesamtbestandswert.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.lagerbestand.length} Lagerpositionen
              </p>
            </CardContent>
          </Card>

          {/* Offene Bestellungen */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Offene Bestellungen
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {offenerBestellwert.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {offeneBestellungen.length} aktive Bestellung(en)
              </p>
            </CardContent>
          </Card>

          {/* Lieferanten */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Lieferanten
              </CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {aktiveLieferantenCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Registrierte Lieferanten
              </p>
            </CardContent>
          </Card>

          {/* Kritische Bestände */}
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Kritische Bestände
              </CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {kritischeBestaende.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Unter Mindestbestand
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Lagerbestand nach Kategorie */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Lagerbestandswert nach Kategorie
              </CardTitle>
              <CardDescription>
                Verteilung des Bestandswerts auf Produktkategorien
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kategorieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kategorieChartData}>
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    />
                    <Bar dataKey="wert" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  Keine Daten vorhanden
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bestellstatus Verteilung */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-amber-600" />
                Bestellstatus Übersicht
              </CardTitle>
              <CardDescription>
                Verteilung der Bestellungen nach Status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  Keine Bestellungen vorhanden
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kritische Bestände & Letzte Wareneingänge */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Kritische Bestände Details */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Produkte unter Mindestbestand
              </CardTitle>
              <CardDescription>
                Produkte, die nachbestellt werden sollten
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kritischeBestaende.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {kritischeBestaende.slice(0, 10).map(bestand => {
                    const produktId = extractRecordId(bestand.fields.produkt);
                    const produkt = produktId ? data.produkte.find(p => p.record_id === produktId) : null;
                    const menge = bestand.fields.menge || 0;
                    const mindestbestand = produkt?.fields.mindestbestand || 0;
                    const fehlmenge = mindestbestand - menge;

                    return (
                      <div key={bestand.record_id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {produkt?.fields.produktname || 'Unbekanntes Produkt'}
                          </p>
                          <p className="text-sm text-slate-600">
                            Bestand: {menge} / Mindest: {mindestbestand}
                          </p>
                        </div>
                        <Badge variant="destructive" className="ml-2">
                          -{fehlmenge.toFixed(1)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                  <p className="text-slate-600 font-medium">Alle Bestände sind ausreichend</p>
                  <p className="text-sm text-slate-500">Keine kritischen Bestände gefunden</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Letzte Wareneingänge */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageOpen className="h-5 w-5 text-green-600" />
                Letzte Wareneingänge
              </CardTitle>
              <CardDescription>
                Die 5 neuesten Wareneingänge
              </CardDescription>
            </CardHeader>
            <CardContent>
              {letzteWareneingaenge.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {letzteWareneingaenge.map(eingang => {
                    const produktId = extractRecordId(eingang.fields.produkt);
                    const produkt = produktId ? data.produkte.find(p => p.record_id === produktId) : null;
                    const lieferantId = extractRecordId(eingang.fields.lieferant);
                    const lieferant = lieferantId ? data.lieferanten.find(l => l.record_id === lieferantId) : null;

                    const qualitaet = eingang.fields.qualitaetspruefung || 'nicht_geprueft';
                    const qualitaetColor =
                      qualitaet === 'bestanden' ? 'bg-green-100 text-green-700 border-green-200' :
                      qualitaet === 'mit_maengeln' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      qualitaet === 'nicht_bestanden' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <div key={eingang.record_id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">
                              {produkt?.fields.produktname || 'Unbekanntes Produkt'}
                            </p>
                            <p className="text-sm text-slate-600">
                              {lieferant?.fields.firmenname || 'Kein Lieferant'}
                            </p>
                          </div>
                          <Badge className={qualitaetColor}>
                            {QUALITAET_LABELS[qualitaet] || qualitaet}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <span>Menge: {eingang.fields.gelieferte_menge || 0}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {eingang.fields.lieferdatum
                              ? format(new Date(eingang.fields.lieferdatum), 'dd.MM.yyyy', { locale: de })
                              : 'Kein Datum'
                            }
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PackageOpen className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-600 font-medium">Noch keine Wareneingänge</p>
                  <p className="text-sm text-slate-500">Erfassen Sie Ihren ersten Wareneingang</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Offene Bestellungen Details */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              Aktuelle Bestellungen
            </CardTitle>
            <CardDescription>
              Übersicht der offenen und aktuellen Bestellungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {offeneBestellungen.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-slate-700">Bestellnummer</th>
                      <th className="text-left p-3 font-medium text-slate-700">Produkt</th>
                      <th className="text-left p-3 font-medium text-slate-700">Lieferant</th>
                      <th className="text-right p-3 font-medium text-slate-700">Menge</th>
                      <th className="text-right p-3 font-medium text-slate-700">Gesamtpreis</th>
                      <th className="text-left p-3 font-medium text-slate-700">Status</th>
                      <th className="text-left p-3 font-medium text-slate-700">Lieferdatum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offeneBestellungen.slice(0, 10).map(bestellung => {
                      const produktId = extractRecordId(bestellung.fields.produkt);
                      const produkt = produktId ? data.produkte.find(p => p.record_id === produktId) : null;
                      const lieferantId = extractRecordId(bestellung.fields.lieferant);
                      const lieferant = lieferantId ? data.lieferanten.find(l => l.record_id === lieferantId) : null;

                      const status = bestellung.fields.status || 'entwurf';
                      const statusColor =
                        status === 'geliefert' ? 'bg-green-100 text-green-700' :
                        status === 'teilweise_geliefert' ? 'bg-amber-100 text-amber-700' :
                        status === 'bestaetigt' ? 'bg-blue-100 text-blue-700' :
                        status === 'bestellt' ? 'bg-purple-100 text-purple-700' :
                        status === 'storniert' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700';

                      return (
                        <tr key={bestellung.record_id} className="border-b hover:bg-slate-50">
                          <td className="p-3 font-medium">
                            {bestellung.fields.bestellnummer || bestellung.record_id.slice(-8)}
                          </td>
                          <td className="p-3">
                            {produkt?.fields.produktname || 'Unbekannt'}
                          </td>
                          <td className="p-3">
                            {lieferant?.fields.firmenname || 'Unbekannt'}
                          </td>
                          <td className="p-3 text-right">
                            {bestellung.fields.bestellmenge || 0}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {(bestellung.fields.gesamtpreis || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </td>
                          <td className="p-3">
                            <Badge className={statusColor}>
                              {STATUS_LABELS[status] || status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {bestellung.fields.erwartetes_lieferdatum
                              ? format(new Date(bestellung.fields.erwartetes_lieferdatum), 'dd.MM.yyyy', { locale: de })
                              : '-'
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">Keine offenen Bestellungen</p>
                <p className="text-sm text-slate-500">Alle Bestellungen sind abgeschlossen</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
