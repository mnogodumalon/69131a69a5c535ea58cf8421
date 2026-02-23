import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Wareneingang, Bestellungen, Produkte, Lieferanten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { WareneingangDialog } from '@/components/dialogs/WareneingangDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

export default function WareneingangPage() {
  const [records, setRecords] = useState<Wareneingang[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Wareneingang | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Wareneingang | null>(null);
  const [bestellungenList, setBestellungenList] = useState<Bestellungen[]>([]);
  const [produkteList, setProdukteList] = useState<Produkte[]>([]);
  const [lieferantenList, setLieferantenList] = useState<Lieferanten[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, bestellungenData, produkteData, lieferantenData] = await Promise.all([
        LivingAppsService.getWareneingang(),
        LivingAppsService.getBestellungen(),
        LivingAppsService.getProdukte(),
        LivingAppsService.getLieferanten(),
      ]);
      setRecords(mainData);
      setBestellungenList(bestellungenData);
      setProdukteList(produkteData);
      setLieferantenList(lieferantenData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Wareneingang['fields']) {
    await LivingAppsService.createWareneingangEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Wareneingang['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateWareneingangEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteWareneingangEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getBestellungenDisplayName(url?: string) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return bestellungenList.find(r => r.record_id === id)?.fields.bestellnummer ?? '—';
  }

  function getProdukteDisplayName(url?: string) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return produkteList.find(r => r.record_id === id)?.fields.produktname ?? '—';
  }

  function getLieferantenDisplayName(url?: string) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return lieferantenList.find(r => r.record_id === id)?.fields.firmenname ?? '—';
  }

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v =>
      String(v ?? '').toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Wareneingang"
      subtitle={`${records.length} Wareneingang im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Wareneingang suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bestellung</TableHead>
              <TableHead>Produkt</TableHead>
              <TableHead>Lieferant</TableHead>
              <TableHead>Lieferdatum</TableHead>
              <TableHead>Gelieferte Menge</TableHead>
              <TableHead>Lagerort</TableHead>
              <TableHead>Qualitätsprüfung</TableHead>
              <TableHead>Abweichungen</TableHead>
              <TableHead>Lieferscheinnummer</TableHead>
              <TableHead>Erfasst von</TableHead>
              <TableHead>Erfassungsdatum</TableHead>
              <TableHead>Notizen</TableHead>
              <TableHead className="w-24">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors">
                <TableCell>{getBestellungenDisplayName(record.fields.bestellung)}</TableCell>
                <TableCell>{getProdukteDisplayName(record.fields.produkt)}</TableCell>
                <TableCell>{getLieferantenDisplayName(record.fields.lieferant)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.lieferdatum)}</TableCell>
                <TableCell>{record.fields.gelieferte_menge ?? '—'}</TableCell>
                <TableCell><Badge variant="secondary">{record.fields.lagerort ?? '—'}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{record.fields.qualitaetspruefung ?? '—'}</Badge></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.abweichungen ?? '—'}</span></TableCell>
                <TableCell className="font-medium">{record.fields.lieferscheinnummer ?? '—'}</TableCell>
                <TableCell>{record.fields.erfasst_von ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.erfassungsdatum)}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.notizen ?? '—'}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Wareneingang. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <WareneingangDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        bestellungenList={bestellungenList}
        produkteList={produkteList}
        lieferantenList={lieferantenList}
        enablePhotoScan={AI_PHOTO_SCAN['Wareneingang']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Wareneingang löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </PageShell>
  );
}