import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Bestellungen, Lieferanten, Produkte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { BestellungenDialog } from '@/components/dialogs/BestellungenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

export default function BestellungenPage() {
  const [records, setRecords] = useState<Bestellungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Bestellungen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bestellungen | null>(null);
  const [lieferantenList, setLieferantenList] = useState<Lieferanten[]>([]);
  const [produkteList, setProdukteList] = useState<Produkte[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, lieferantenData, produkteData] = await Promise.all([
        LivingAppsService.getBestellungen(),
        LivingAppsService.getLieferanten(),
        LivingAppsService.getProdukte(),
      ]);
      setRecords(mainData);
      setLieferantenList(lieferantenData);
      setProdukteList(produkteData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Bestellungen['fields']) {
    await LivingAppsService.createBestellungenEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Bestellungen['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateBestellungenEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBestellungenEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getLieferantenDisplayName(url?: string) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return lieferantenList.find(r => r.record_id === id)?.fields.firmenname ?? '—';
  }

  function getProdukteDisplayName(url?: string) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return produkteList.find(r => r.record_id === id)?.fields.produktname ?? '—';
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
      title="Bestellungen"
      subtitle={`${records.length} Bestellungen im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Bestellungen suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bestellnummer</TableHead>
              <TableHead>Lieferant</TableHead>
              <TableHead>Produkt</TableHead>
              <TableHead>Bestellmenge</TableHead>
              <TableHead>Preis pro Einheit (EUR)</TableHead>
              <TableHead>Gesamtpreis (EUR)</TableHead>
              <TableHead>Bestelldatum</TableHead>
              <TableHead>Erwartetes Lieferdatum</TableHead>
              <TableHead>Bestellstatus</TableHead>
              <TableHead>Bestellnummer beim Lieferanten</TableHead>
              <TableHead>Notizen</TableHead>
              <TableHead className="w-24">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">{record.fields.bestellnummer ?? '—'}</TableCell>
                <TableCell>{getLieferantenDisplayName(record.fields.lieferant)}</TableCell>
                <TableCell>{getProdukteDisplayName(record.fields.produkt)}</TableCell>
                <TableCell>{record.fields.bestellmenge ?? '—'}</TableCell>
                <TableCell>{record.fields.preis_pro_einheit ?? '—'}</TableCell>
                <TableCell>{record.fields.gesamtpreis ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.bestelldatum)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.erwartetes_lieferdatum)}</TableCell>
                <TableCell><Badge variant="secondary">{record.fields.status ?? '—'}</Badge></TableCell>
                <TableCell>{record.fields.lieferantenbestellung ?? '—'}</TableCell>
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
                <TableCell colSpan={12} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Bestellungen. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <BestellungenDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        lieferantenList={lieferantenList}
        produkteList={produkteList}
        enablePhotoScan={AI_PHOTO_SCAN['Bestellungen']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Bestellungen löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </PageShell>
  );
}