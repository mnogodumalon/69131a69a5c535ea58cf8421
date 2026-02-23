import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Lagerbestand, Produkte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { LagerbestandDialog } from '@/components/dialogs/LagerbestandDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

export default function LagerbestandPage() {
  const [records, setRecords] = useState<Lagerbestand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Lagerbestand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lagerbestand | null>(null);
  const [produkteList, setProdukteList] = useState<Produkte[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, produkteData] = await Promise.all([
        LivingAppsService.getLagerbestand(),
        LivingAppsService.getProdukte(),
      ]);
      setRecords(mainData);
      setProdukteList(produkteData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Lagerbestand['fields']) {
    await LivingAppsService.createLagerbestandEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Lagerbestand['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateLagerbestandEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteLagerbestandEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
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
      title="Lagerbestand"
      subtitle={`${records.length} Lagerbestand im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Lagerbestand suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produkt</TableHead>
              <TableHead>Lagerort</TableHead>
              <TableHead>Aktuelle Bestandsmenge</TableHead>
              <TableHead>Reservierte Menge</TableHead>
              <TableHead>Verfügbare Menge</TableHead>
              <TableHead>Letzte Inventur</TableHead>
              <TableHead>Notizen</TableHead>
              <TableHead className="w-24">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors">
                <TableCell>{getProdukteDisplayName(record.fields.produkt)}</TableCell>
                <TableCell><Badge variant="secondary">{record.fields.lagerort ?? '—'}</Badge></TableCell>
                <TableCell>{record.fields.menge ?? '—'}</TableCell>
                <TableCell>{record.fields.reserviert ?? '—'}</TableCell>
                <TableCell>{record.fields.verfuegbar ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.letzte_inventur)}</TableCell>
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
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Lagerbestand. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LagerbestandDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        produkteList={produkteList}
        enablePhotoScan={AI_PHOTO_SCAN['Lagerbestand']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Lagerbestand löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </PageShell>
  );
}