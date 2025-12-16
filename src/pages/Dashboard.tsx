import { useEffect, useState } from 'react';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Produkte, Lagerbestand, Bestellungen, Wareneingang, Lieferanten } from '@/types/app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Truck,
  PackageCheck,
  PackageX,
  Euro,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

// Chart Colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface DashboardData {
  produkte: Produkte[];
  lagerbestand: Lagerbestand[];
  bestellungen: Bestellungen[];
  wareneingang: Wareneingang[];
  lieferanten: Lieferanten[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state für Wareneingang erfassen
  const [formData, setFormData] = useState({
    bestellung: '',
    produkt: '',
    lieferant: '',
    lieferdatum: format(new Date(), 'yyyy-MM-dd'),
    gelieferte_menge: '',
    lagerort: '',
    qualitaetspruefung: 'bestanden',
    lieferscheinnummer: '',
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
      await LivingAppsService.createWareneingangEntry({
        bestellung: formData.bestellung || undefined,
        produkt: formData.produkt || undefined,
        lieferant: formData.lieferant || undefined,
        lieferdatum: formData.lieferdatum,
        gelieferte_menge: formData.gelieferte_menge ? parseFloat(formData.gelieferte_menge) : undefined,
        lagerort: formData.lagerort || undefined,
        qualitaetspruefung: formData.qualitaetspruefung,
        lieferscheinnummer: formData.lieferscheinnummer || undefined,
        erfasst_von: formData.erfasst_von || undefined,
        erfassungsdatum: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      });

      toast.success('Wareneingang erfolgreich erfasst!');
      setDialogOpen(false);
      setFormData({
        bestellung: '',
        produkt: '',
        lieferant: '',
        lieferdatum: format(new Date(), 'yyyy-MM-dd'),
        gelieferte_menge: '',
        lagerort: '',
        qualitaetspruefung: 'bestanden',
        lieferscheinnummer: '',
        erfasst_von: '',
      });

      // Reload data
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
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

  if (!data) return null;

  // --- KPI BERECHNUNGEN ---

  // 1. Gesamtanzahl Produkte
  const totalProdukte = data.produkte.length;
  const activeProdukte = data.produkte.filter(p => p.fields.aktiv === 'aktiv').length;

  // 2. Produkte mit kritischem Bestand (unterhalb Mindestbestand)
  const lowStockProducts = data.lagerbestand.filter(lb => {
    const produktId = extractRecordId(lb.fields.produkt);
    if (!produktId) return false;

    const produkt = data.produkte.find(p => p.record_id === produktId);
    if (!produkt || !produkt.fields.mindestbestand) return false;

    return (lb.fields.verfuegbar || 0) < produkt.fields.mindestbestand;
  });

  // 3. Offene Bestellungen
  const offeneBestellungen = data.bestellungen.filter(b =>
    b.fields.status !== 'geliefert' && b.fields.status !== 'storniert'
  );

  // 4. Wareneingänge heute
  const today = format(new Date(), 'yyyy-MM-dd');
  const wareneingangHeute = data.wareneingang.filter(w => w.fields.lieferdatum === today);

  // 5. Gesamtwert Lager (basierend auf Einkaufspreisen)
  const lagerwert = data.lagerbestand.reduce((sum, lb) => {
    const produktId = extractRecordId(lb.fields.produkt);
    if (!produktId) return sum;

    const produkt = data.produkte.find(p => p.record_id === produktId);
    if (!produkt) return sum;

    const menge = lb.fields.menge || 0;
    const einkaufspreis = produkt.fields.einkaufspreis || 0;
    return sum + (menge * einkaufspreis);
  }, 0);

  // 6. Gesamtwert offene Bestellungen
  const bestellwert = offeneBestellungen.reduce((sum, b) => sum + (b.fields.gesamtpreis || 0), 0);

  // 7. Durchschnittliche Lieferzeit der Lieferanten
  const avgLieferzeit = data.lieferanten.length > 0
    ? data.lieferanten.reduce((sum, l) => sum + (l.fields.lieferzeit || 0), 0) / data.lieferanten.length
    : 0;

  // --- CHART DATEN ---

  // Lagerbestand nach Produkt (Top 10)
  const lagerbestandChart = data.lagerbestand
    .map(lb => {
      const produktId = extractRecordId(lb.fields.produkt);
      if (!produktId) return null;

      const produkt = data.produkte.find(p => p.record_id === produktId);
      if (!produkt) return null;

      return {
        name: produkt.fields.produktname || 'Unbekannt',
        bestand: lb.fields.menge || 0,
        verfuegbar: lb.fields.verfuegbar || 0,
        reserviert: lb.fields.reserviert || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.bestand || 0) - (a?.bestand || 0))
    .slice(0, 10) as { name: string; bestand: number; verfuegbar: number; reserviert: number }[];

  // Bestellstatus Verteilung
  const bestellstatusChart = data.bestellungen.reduce((acc, b) => {
    const status = b.fields.status || 'offen';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bestellstatusPieData = Object.entries(bestellstatusChart).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Wareneingänge der letzten 7 Tage
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return format(date, 'yyyy-MM-dd');
  });

  const wareneingangTrendData = last7Days.map(date => {
    const count = data.wareneingang.filter(w => w.fields.lieferdatum === date).length;
    return {
      datum: format(new Date(date), 'dd.MM', { locale: de }),
      anzahl: count,
    };
  });

  // Lieferantenbewertungen
  const lieferantenBewertungData = data.lieferanten.reduce((acc, l) => {
    const bewertung = l.fields.bewertung || 'keine';
    acc[bewertung] = (acc[bewertung] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lieferantenPieData = Object.entries(lieferantenBewertungData).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lagerverwaltungssystem TEST!!!</h1>
          <p className="text-muted-foreground">Echtzeit-Übersicht aller wichtigen Kennzahlen</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <PlusCircle className="h-5 w-5" />
              Wareneingang erfassen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleWareneingangSubmit}>
              <DialogHeader>
                <DialogTitle>Neuer Wareneingang</DialogTitle>
                <DialogDescription>
                  Erfassen Sie eine neue Warenlieferung und aktualisieren Sie den Lagerbestand.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="lieferant">Lieferant</Label>
                  <Select value={formData.lieferant} onValueChange={(v) => setFormData({ ...formData, lieferant: v })}>
                    <SelectTrigger id="lieferant">
                      <SelectValue placeholder="Lieferant auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {data.lieferanten.map(l => (
                        <SelectItem key={l.record_id} value={l.record_id}>
                          {l.fields.firmenname} ({l.fields.lieferantennummer})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="produkt">Produkt *</Label>
                  <Select value={formData.produkt} onValueChange={(v) => setFormData({ ...formData, produkt: v })} required>
                    <SelectTrigger id="produkt">
                      <SelectValue placeholder="Produkt auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {data.produkte.map(p => (
                        <SelectItem key={p.record_id} value={p.record_id}>
                          {p.fields.produktname} ({p.fields.artikelnummer})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="bestellung">Bestellung (optional)</Label>
                  <Select value={formData.bestellung} onValueChange={(v) => setFormData({ ...formData, bestellung: v })}>
                    <SelectTrigger id="bestellung">
                      <SelectValue placeholder="Bestellung auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keine Bestellung</SelectItem>
                      {data.bestellungen.map(b => (
                        <SelectItem key={b.record_id} value={b.record_id}>
                          {b.fields.bestellnummer} - {b.fields.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="gelieferte_menge">Gelieferte Menge *</Label>
                    <Input
                      id="gelieferte_menge"
                      type="number"
                      step="0.01"
                      value={formData.gelieferte_menge}
                      onChange={(e) => setFormData({ ...formData, gelieferte_menge: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="lieferdatum">Lieferdatum *</Label>
                    <Input
                      id="lieferdatum"
                      type="date"
                      value={formData.lieferdatum}
                      onChange={(e) => setFormData({ ...formData, lieferdatum: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="lagerort">Lagerort</Label>
                    <Input
                      id="lagerort"
                      value={formData.lagerort}
                      onChange={(e) => setFormData({ ...formData, lagerort: e.target.value })}
                      placeholder="z.B. Regal A1"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="qualitaetspruefung">Qualitätsprüfung *</Label>
                    <Select value={formData.qualitaetspruefung} onValueChange={(v) => setFormData({ ...formData, qualitaetspruefung: v })}>
                      <SelectTrigger id="qualitaetspruefung">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bestanden">Bestanden</SelectItem>
                        <SelectItem value="fehlgeschlagen">Fehlgeschlagen</SelectItem>
                        <SelectItem value="nicht_geprueft">Nicht geprüft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lieferscheinnummer">Lieferscheinnummer</Label>
                  <Input
                    id="lieferscheinnummer"
                    value={formData.lieferscheinnummer}
                    onChange={(e) => setFormData({ ...formData, lieferscheinnummer: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="erfasst_von">Erfasst von</Label>
                  <Input
                    id="erfasst_von"
                    value={formData.erfasst_von}
                    onChange={(e) => setFormData({ ...formData, erfasst_von: e.target.value })}
                    placeholder="Ihr Name"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner className="h-4 w-4" /> : 'Speichern'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produkte</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProdukte}</div>
            <p className="text-xs text-muted-foreground">
              {activeProdukte} aktiv
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritischer Bestand</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Produkte unter Mindestbestand
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Bestellungen</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offeneBestellungen.length}</div>
            <p className="text-xs text-muted-foreground">
              Wert: {bestellwert.toFixed(2)} EUR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wareneingänge Heute</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{wareneingangHeute.length}</div>
            <p className="text-xs text-muted-foreground">
              Lieferungen eingegangen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lagerwert</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lagerwert.toFixed(2)} EUR</div>
            <p className="text-xs text-muted-foreground">
              Basierend auf Einkaufspreisen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lieferanten</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.lieferanten.length}</div>
            <p className="text-xs text-muted-foreground">
              Ø Lieferzeit: {avgLieferzeit.toFixed(1)} Tage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Wareneingänge</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.wareneingang.length}</div>
            <p className="text-xs text-muted-foreground">
              Alle erfassten Lieferungen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lagerbestand Top 10 Produkte</CardTitle>
            <CardDescription>Aktuelle Bestände und Verfügbarkeiten</CardDescription>
          </CardHeader>
          <CardContent>
            {lagerbestandChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={lagerbestandChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="verfuegbar" name="Verfügbar" fill="#10b981" />
                  <Bar dataKey="reserviert" name="Reserviert" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Keine Lagerbestandsdaten verfügbar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bestellstatus Verteilung</CardTitle>
            <CardDescription>Übersicht aller Bestellungen nach Status</CardDescription>
          </CardHeader>
          <CardContent>
            {bestellstatusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bestellstatusPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bestellstatusPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Keine Bestellungen verfügbar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wareneingänge letzte 7 Tage</CardTitle>
            <CardDescription>Trendanalyse der Lieferungen</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={wareneingangTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="datum" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="anzahl" name="Wareneingänge" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lieferantenbewertungen</CardTitle>
            <CardDescription>Verteilung der Bewertungen</CardDescription>
          </CardHeader>
          <CardContent>
            {lieferantenPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={lieferantenPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {lieferantenPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Keine Lieferantenbewertungen verfügbar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kritische Bestände Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-900">Kritische Bestände</CardTitle>
            </div>
            <CardDescription>Diese Produkte haben einen Bestand unterhalb des Mindestbestands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map(lb => {
                const produktId = extractRecordId(lb.fields.produkt);
                if (!produktId) return null;

                const produkt = data.produkte.find(p => p.record_id === produktId);
                if (!produkt) return null;

                return (
                  <div key={lb.record_id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <PackageX className="h-5 w-5 text-amber-600" />
                      <div>
                        <div className="font-medium">{produkt.fields.produktname}</div>
                        <div className="text-sm text-muted-foreground">
                          Artikelnr: {produkt.fields.artikelnummer}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">
                        {lb.fields.verfuegbar || 0} / {produkt.fields.mindestbestand} Mindest
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Lagerort: {lb.fields.lagerort || 'N/A'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {lowStockProducts.length > 5 && (
              <p className="text-sm text-muted-foreground mt-4">
                ... und {lowStockProducts.length - 5} weitere Produkte
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Offene Bestellungen */}
      <Card>
        <CardHeader>
          <CardTitle>Offene Bestellungen</CardTitle>
          <CardDescription>Bestellungen die noch nicht geliefert wurden</CardDescription>
        </CardHeader>
        <CardContent>
          {offeneBestellungen.length > 0 ? (
            <div className="space-y-2">
              {offeneBestellungen.slice(0, 5).map(bestellung => {
                const lieferantId = extractRecordId(bestellung.fields.lieferant);
                const produktId = extractRecordId(bestellung.fields.produkt);

                const lieferant = lieferantId ? data.lieferanten.find(l => l.record_id === lieferantId) : null;
                const produkt = produktId ? data.produkte.find(p => p.record_id === produktId) : null;

                // Status Badge Farbe
                const statusColor =
                  bestellung.fields.status === 'in_bearbeitung' ? 'default' :
                  bestellung.fields.status === 'versendet' ? 'secondary' :
                  bestellung.fields.status === 'geliefert' ? 'default' :
                  'default';

                return (
                  <div key={bestellung.record_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{bestellung.fields.bestellnummer}</div>
                        <div className="text-sm text-muted-foreground">
                          {lieferant?.fields.firmenname || 'Unbekannt'} - {produkt?.fields.produktname || 'Unbekannt'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="font-medium">{bestellung.fields.gesamtpreis?.toFixed(2)} EUR</div>
                        <div className="text-xs text-muted-foreground">
                          {bestellung.fields.erwartetes_lieferdatum && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(bestellung.fields.erwartetes_lieferdatum), 'dd.MM.yyyy', { locale: de })}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={statusColor}>
                        {bestellung.fields.status || 'offen'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-2 text-green-600" />
              <p>Keine offenen Bestellungen</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Letzte Wareneingänge */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Wareneingänge</CardTitle>
          <CardDescription>Die 10 neuesten Warenlieferungen</CardDescription>
        </CardHeader>
        <CardContent>
          {data.wareneingang.length > 0 ? (
            <div className="space-y-2">
              {data.wareneingang
                .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
                .slice(0, 10)
                .map(we => {
                  const produktId = extractRecordId(we.fields.produkt);
                  const lieferantId = extractRecordId(we.fields.lieferant);

                  const produkt = produktId ? data.produkte.find(p => p.record_id === produktId) : null;
                  const lieferant = lieferantId ? data.lieferanten.find(l => l.record_id === lieferantId) : null;

                  const qualityIcon =
                    we.fields.qualitaetspruefung === 'bestanden' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                    we.fields.qualitaetspruefung === 'fehlgeschlagen' ? <XCircle className="h-4 w-4 text-red-600" /> :
                    <Clock className="h-4 w-4 text-amber-600" />;

                  return (
                    <div key={we.record_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium">{produkt?.fields.produktname || 'Unbekannt'}</div>
                          <div className="text-sm text-muted-foreground">
                            {lieferant?.fields.firmenname || 'Unbekannt'} - {we.fields.gelieferte_menge} Einheiten
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <div className="text-sm font-medium">
                            {we.fields.lieferdatum && format(new Date(we.fields.lieferdatum), 'dd.MM.yyyy', { locale: de })}
                          </div>
                          <div className="text-xs text-muted-foreground">{we.fields.lagerort || 'N/A'}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {qualityIcon}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <PackageX className="h-12 w-12 mb-2" />
              <p>Noch keine Wareneingänge erfasst</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
