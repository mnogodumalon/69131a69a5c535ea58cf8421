import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBestellungen, enrichLagerbestand } from '@/lib/enrich';
import type { EnrichedBestellungen, EnrichedLagerbestand } from '@/types/enriched';
import type { Bestellungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Plus, Truck, Package, AlertTriangle, TrendingUp, ChevronRight, X, Edit2, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'entwurf' | 'bestellt' | 'bestaetigt' | 'teilweise_geliefert' | 'geliefert' | 'storniert';

const STATUS_COLUMNS: { key: OrderStatus; label: string; color: string; bg: string }[] = [
  { key: 'entwurf',             label: 'Entwurf',           color: 'text-slate-500',   bg: 'bg-slate-100' },
  { key: 'bestellt',            label: 'Bestellt',           color: 'text-blue-600',    bg: 'bg-blue-50' },
  { key: 'bestaetigt',          label: 'Bestätigt',          color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  { key: 'teilweise_geliefert', label: 'Teilw. geliefert',  color: 'text-amber-600',   bg: 'bg-amber-50' },
  { key: 'geliefert',           label: 'Geliefert',          color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

const STATUS_BADGE: Record<OrderStatus, string> = {
  entwurf:             'bg-slate-100 text-slate-600',
  bestellt:            'bg-blue-100 text-blue-700',
  bestaetigt:          'bg-indigo-100 text-indigo-700',
  teilweise_geliefert: 'bg-amber-100 text-amber-700',
  geliefert:           'bg-emerald-100 text-emerald-700',
  storniert:           'bg-red-100 text-red-600',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  entwurf:             'Entwurf',
  bestellt:            'Bestellt',
  bestaetigt:          'Bestätigt',
  teilweise_geliefert: 'Teilw. geliefert',
  geliefert:           'Geliefert',
  storniert:           'Storniert',
};

interface OrderForm {
  bestellnummer: string;
  lieferant: string;
  produkt: string;
  bestellmenge: string;
  preis_pro_einheit: string;
  bestelldatum: string;
  erwartetes_lieferdatum: string;
  status: OrderStatus;
  notizen: string;
}

const emptyForm = (): OrderForm => ({
  bestellnummer: '',
  lieferant: '',
  produkt: '',
  bestellmenge: '',
  preis_pro_einheit: '',
  bestelldatum: new Date().toISOString().slice(0, 10),
  erwartetes_lieferdatum: '',
  status: 'entwurf',
  notizen: '',
});

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const {
    lieferanten, bestellungen, produkte, lagerbestand,
    lieferantenMap, bestellungenMap, produkteMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBestellungen = enrichBestellungen(bestellungen, { lieferantenMap, produkteMap });
  const enrichedLagerbestand = enrichLagerbestand(lagerbestand, { produkteMap });

  // Modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnrichedBestellungen | null>(null);
  const [form, setForm] = useState<OrderForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<EnrichedBestellungen | null>(null);

  // KPIs
  const activeOrders = enrichedBestellungen.filter(b => b.fields.status !== 'geliefert' && b.fields.status !== 'storniert');
  const totalOrderValue = enrichedBestellungen.reduce((s, b) => s + (b.fields.gesamtpreis ?? 0), 0);
  const lowStockItems = enrichedLagerbestand.filter(l => {
    const prodId = extractRecordId(l.fields.produkt);
    if (!prodId) return false;
    const prod = produkteMap.get(prodId);
    const min = prod?.fields.mindestbestand ?? 0;
    return (l.fields.verfuegbar ?? l.fields.menge ?? 0) <= min && min > 0;
  });
  const pendingWareneingang = bestellungen.filter(b =>
    b.fields.status === 'bestellt' || b.fields.status === 'bestaetigt' || b.fields.status === 'teilweise_geliefert'
  ).length;

  // Kanban columns (exclude storniert from board)
  const kanbanColumns = STATUS_COLUMNS.map(col => ({
    ...col,
    orders: enrichedBestellungen.filter(b => (b.fields.status ?? 'entwurf') === col.key),
  }));

  // Chart: orders by status
  const chartData = STATUS_COLUMNS.map(col => ({
    name: col.label,
    Anzahl: enrichedBestellungen.filter(b => (b.fields.status ?? 'entwurf') === col.key).length,
  }));

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openCreate(defaultStatus: OrderStatus = 'entwurf') {
    setEditTarget(null);
    setForm({ ...emptyForm(), status: defaultStatus });
    setDialogOpen(true);
  }

  function openEdit(order: EnrichedBestellungen) {
    setEditTarget(order);
    const f = order.fields;
    setForm({
      bestellnummer: f.bestellnummer ?? '',
      lieferant: extractRecordId(f.lieferant) ?? '',
      produkt: extractRecordId(f.produkt) ?? '',
      bestellmenge: String(f.bestellmenge ?? ''),
      preis_pro_einheit: String(f.preis_pro_einheit ?? ''),
      bestelldatum: f.bestelldatum ?? '',
      erwartetes_lieferdatum: f.erwartetes_lieferdatum ?? '',
      status: (f.status as OrderStatus) ?? 'entwurf',
      notizen: f.notizen ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const menge = parseFloat(form.bestellmenge) || 0;
      const preis = parseFloat(form.preis_pro_einheit) || 0;
      const fields: Bestellungen['fields'] = {
        bestellnummer: form.bestellnummer || undefined,
        lieferant: form.lieferant ? createRecordUrl(APP_IDS.LIEFERANTEN, form.lieferant) : undefined,
        produkt: form.produkt ? createRecordUrl(APP_IDS.PRODUKTE, form.produkt) : undefined,
        bestellmenge: menge || undefined,
        preis_pro_einheit: preis || undefined,
        gesamtpreis: menge && preis ? menge * preis : undefined,
        bestelldatum: form.bestelldatum || undefined,
        erwartetes_lieferdatum: form.erwartetes_lieferdatum || undefined,
        status: form.status,
        notizen: form.notizen || undefined,
      };
      if (editTarget) {
        await LivingAppsService.updateBestellungenEntry(editTarget.record_id, fields);
      } else {
        await LivingAppsService.createBestellungenEntry(fields);
      }
      fetchAll();
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await LivingAppsService.deleteBestellungenEntry(id);
    fetchAll();
    setDeleteTarget(null);
    if (selectedOrder?.record_id === id) setSelectedOrder(null);
  }

  async function handleStatusChange(order: EnrichedBestellungen, newStatus: OrderStatus) {
    await LivingAppsService.updateBestellungenEntry(order.record_id, { status: newStatus });
    fetchAll();
  }

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Übersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Lager- & Bestellmanagement</p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2">
          <Plus size={15} />
          Neue Bestellung
        </Button>
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Aktive Bestellungen"
          value={String(activeOrders.length)}
          icon={<ShoppingCartIcon />}
          accent="indigo"
          sub={`von ${enrichedBestellungen.length} gesamt`}
        />
        <KpiCard
          label="Bestellwert gesamt"
          value={formatCurrency(totalOrderValue)}
          icon={<TrendingUp size={18} />}
          accent="emerald"
          sub="alle Bestellungen"
        />
        <KpiCard
          label="Unterbestand"
          value={String(lowStockItems.length)}
          icon={<AlertTriangle size={18} />}
          accent={lowStockItems.length > 0 ? 'amber' : 'slate'}
          sub={lowStockItems.length > 0 ? 'Produkte kritisch' : 'Alles in Ordnung'}
        />
        <KpiCard
          label="Ausstehende Lieferungen"
          value={String(pendingWareneingang)}
          icon={<Truck size={18} />}
          accent="blue"
          sub="in Bearbeitung"
        />
      </div>

      {/* ── Kanban Board ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Bestellungspipeline</h2>
          <span className="text-xs text-muted-foreground">{enrichedBestellungen.filter(b => b.fields.status !== 'storniert').length} aktive Bestellungen</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 overflow-x-auto">
          {kanbanColumns.map(col => (
            <div key={col.key} className="flex flex-col min-w-[200px]">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${col.bg} border-b border-border/30`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${col.color}`}>{col.label}</span>
                <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 ${col.bg} ${col.color} border border-current/20`}>
                  {col.orders.length}
                </span>
              </div>
              {/* Cards */}
              <div className="flex flex-col gap-2 p-2 bg-card/50 rounded-b-xl border border-t-0 border-border/40 min-h-[120px]">
                {col.orders.map(order => (
                  <OrderCard
                    key={order.record_id}
                    order={order}
                    isSelected={selectedOrder?.record_id === order.record_id}
                    onSelect={() => setSelectedOrder(selectedOrder?.record_id === order.record_id ? null : order)}
                    onEdit={() => openEdit(order)}
                    onDelete={() => setDeleteTarget(order.record_id)}
                    onStatusChange={(s) => handleStatusChange(order, s)}
                  />
                ))}
                <button
                  onClick={() => openCreate(col.key)}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors flex items-center justify-center gap-1 border border-dashed border-border/40 mt-auto"
                >
                  <Plus size={12} /> Hinzufügen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Row: Chart + Stock Alerts ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Bestellungen nach Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
              />
              <Bar dataKey="Anzahl" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock Alerts + Top Lager */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Lagerbestand — Kritische Artikel</h3>
          {lowStockItems.length === 0 ? (
            <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <Check size={14} className="text-emerald-600" />
              </div>
              Alle Bestände im grünen Bereich.
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[180px]">
              {lowStockItems.map(item => {
                const prodId = extractRecordId(item.fields.produkt);
                const prod = prodId ? produkteMap.get(prodId) : null;
                const min = prod?.fields.mindestbestand ?? 0;
                const avail = item.fields.verfuegbar ?? item.fields.menge ?? 0;
                return (
                  <div key={item.record_id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                      <span className="text-sm font-medium text-foreground">{item.produktName || '—'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-700">{avail}</span>
                      <span className="text-xs text-muted-foreground"> / min {min}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Top Lagerorte</p>
            <div className="space-y-1">
              {(() => {
                const byLoc = new Map<string, number>();
                enrichedLagerbestand.forEach(l => {
                  const loc = l.fields.lagerort ?? 'unbekannt';
                  byLoc.set(loc, (byLoc.get(loc) ?? 0) + (l.fields.menge ?? 0));
                });
                const sorted = [...byLoc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
                const locLabels: Record<string, string> = {
                  regal_a1: 'Regal A1', regal_a2: 'Regal A2', regal_b1: 'Regal B1', regal_b2: 'Regal B2',
                  hochregal_1: 'Hochregal 1', kuehllager: 'Kühllager', aussenlager: 'Außenlager', retoure: 'Retoure',
                };
                return sorted.map(([loc, qty]) => (
                  <div key={loc} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{locLabels[loc] ?? loc}</span>
                    <span className="font-semibold text-foreground">{qty} St.</span>
                  </div>
                ));
              })()}
              {enrichedLagerbestand.length === 0 && (
                <p className="text-xs text-muted-foreground">Kein Lagerbestand erfasst.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Order Detail Panel ─────────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              Bestellung: {selectedOrder.fields.bestellnummer ?? selectedOrder.record_id.slice(-6)}
            </h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(selectedOrder)} className="gap-1">
                <Edit2 size={13} /> Bearbeiten
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(null)}>
                <X size={14} />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <DetailField label="Lieferant" value={selectedOrder.lieferantName || '—'} />
            <DetailField label="Produkt" value={selectedOrder.produktName || '—'} />
            <DetailField label="Menge" value={String(selectedOrder.fields.bestellmenge ?? '—')} />
            <DetailField label="Gesamtpreis" value={formatCurrency(selectedOrder.fields.gesamtpreis)} />
            <DetailField label="Bestelldatum" value={formatDate(selectedOrder.fields.bestelldatum)} />
            <DetailField label="Lieferdatum" value={formatDate(selectedOrder.fields.erwartetes_lieferdatum)} />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status ändern</p>
              <select
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground w-full"
                value={selectedOrder.fields.status ?? 'entwurf'}
                onChange={e => handleStatusChange(selectedOrder, e.target.value as OrderStatus)}
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {selectedOrder.fields.notizen && (
              <div className="col-span-2 md:col-span-1">
                <DetailField label="Notizen" value={selectedOrder.fields.notizen} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create/Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Bestellung bearbeiten' : 'Neue Bestellung'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bestellnummer">Bestellnummer</Label>
                <Input id="bestellnummer" value={form.bestellnummer}
                  onChange={e => setForm(f => ({ ...f, bestellnummer: e.target.value }))}
                  placeholder="z.B. B-2025-001" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as OrderStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lieferant</Label>
                <Select value={form.lieferant || 'none'} onValueChange={v => setForm(f => ({ ...f, lieferant: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Lieferant wählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— kein Lieferant —</SelectItem>
                    {lieferanten.map(l => (
                      <SelectItem key={l.record_id} value={l.record_id}>
                        {l.fields.firmenname ?? l.record_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Produkt</Label>
                <Select value={form.produkt || 'none'} onValueChange={v => setForm(f => ({ ...f, produkt: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Produkt wählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— kein Produkt —</SelectItem>
                    {produkte.map(p => (
                      <SelectItem key={p.record_id} value={p.record_id}>
                        {p.fields.produktname ?? p.record_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="menge">Menge</Label>
                <Input id="menge" type="number" value={form.bestellmenge}
                  onChange={e => setForm(f => ({ ...f, bestellmenge: e.target.value }))}
                  placeholder="0" />
              </div>
              <div>
                <Label htmlFor="preis">Preis/Einheit (€)</Label>
                <Input id="preis" type="number" value={form.preis_pro_einheit}
                  onChange={e => setForm(f => ({ ...f, preis_pro_einheit: e.target.value }))}
                  placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bestelldatum">Bestelldatum</Label>
                <Input id="bestelldatum" type="date" value={form.bestelldatum}
                  onChange={e => setForm(f => ({ ...f, bestelldatum: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="lieferdatum">Erw. Lieferdatum</Label>
                <Input id="lieferdatum" type="date" value={form.erwartetes_lieferdatum}
                  onChange={e => setForm(f => ({ ...f, erwartetes_lieferdatum: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="notizen">Notizen</Label>
              <Input id="notizen" value={form.notizen}
                onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))}
                placeholder="Optionale Notizen..." />
            </div>
            {form.bestellmenge && form.preis_pro_einheit && (
              <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-2.5 text-sm flex justify-between">
                <span className="text-muted-foreground">Gesamtpreis</span>
                <span className="font-bold text-primary">
                  {formatCurrency(parseFloat(form.bestellmenge) * parseFloat(form.preis_pro_einheit))}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Speichern...' : editTarget ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bestellung löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Diese Aktion kann nicht rückgängig gemacht werden.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────────────────

function ShoppingCartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}

function KpiCard({ label, value, icon, accent, sub }: {
  label: string; value: string; icon: React.ReactNode; accent: string; sub: string;
}) {
  const accentMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    slate: 'bg-slate-50 text-slate-500',
  };
  const cls = accentMap[accent] ?? accentMap.slate;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cls}`}>{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </div>
    </div>
  );
}

function OrderCard({ order, isSelected, onSelect, onEdit, onDelete, onStatusChange }: {
  order: EnrichedBestellungen;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: OrderStatus) => void;
}) {
  const status = (order.fields.status ?? 'entwurf') as OrderStatus;
  const badgeCls = STATUS_BADGE[status] ?? STATUS_BADGE.entwurf;

  // Next status for quick-advance button
  const statusOrder: OrderStatus[] = ['entwurf', 'bestellt', 'bestaetigt', 'teilweise_geliefert', 'geliefert'];
  const idx = statusOrder.indexOf(status);
  const nextStatus = idx >= 0 && idx < statusOrder.length - 1 ? statusOrder[idx + 1] : null;

  return (
    <div
      className={`rounded-xl p-3 cursor-pointer transition-all border ${
        isSelected
          ? 'border-primary/40 bg-primary/5 shadow-sm'
          : 'border-border/30 bg-background hover:border-border/60 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className="text-xs font-bold text-foreground truncate">
          {order.fields.bestellnummer || order.record_id.slice(-6)}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={e => { e.stopPropagation(); onEdit(); }}
          >
            <Edit2 size={11} />
          </button>
          <button
            className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={e => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {order.lieferantName && (
        <p className="text-xs text-muted-foreground truncate mb-0.5">{order.lieferantName}</p>
      )}
      {order.produktName && (
        <p className="text-xs text-foreground/70 truncate">{order.produktName}</p>
      )}
      {order.fields.gesamtpreis != null && (
        <p className="text-xs font-semibold text-foreground mt-1">{formatCurrency(order.fields.gesamtpreis)}</p>
      )}
      {order.fields.erwartetes_lieferdatum && (
        <p className="text-xs text-muted-foreground mt-0.5">
          Lieferung: {formatDate(order.fields.erwartetes_lieferdatum)}
        </p>
      )}
      {nextStatus && (
        <button
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg py-1 transition-colors border border-primary/20"
          onClick={e => { e.stopPropagation(); onStatusChange(nextStatus); }}
        >
          <ChevronRight size={11} /> {STATUS_LABEL[nextStatus]}
        </button>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
