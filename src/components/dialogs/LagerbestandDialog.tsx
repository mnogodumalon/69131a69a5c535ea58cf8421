import { useState, useEffect, useRef } from 'react';
import type { Lagerbestand, Produkte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Camera, Loader2 } from 'lucide-react';
import { extractFromPhoto, fileToDataUri } from '@/lib/ai';

interface LagerbestandDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Lagerbestand['fields']) => Promise<void>;
  defaultValues?: Lagerbestand['fields'];
  produkteList: Produkte[];
  enablePhotoScan?: boolean;
}

export function LagerbestandDialog({ open, onClose, onSubmit, defaultValues, produkteList, enablePhotoScan = false }: LagerbestandDialogProps) {
  const [fields, setFields] = useState<Partial<Lagerbestand['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setFields(defaultValues ?? {});
  }, [open, defaultValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(fields as Lagerbestand['fields']);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    try {
      const uri = await fileToDataUri(file);
      const schema = `{\n  "produkt": string | null, // Name des Produkte-Eintrags (z.B. "Jonas Schmidt")\n  "lagerort": "regal_a1" | "regal_a2" | "regal_b1" | "regal_b2" | "hochregal_1" | "kuehllager" | "aussenlager" | "retoure" | null, // Lagerort\n  "menge": number | null, // Aktuelle Bestandsmenge\n  "reserviert": number | null, // Reservierte Menge\n  "verfuegbar": number | null, // Verfügbare Menge\n  "letzte_inventur": string | null, // YYYY-MM-DD // Letzte Inventur\n  "notizen": string | null, // Notizen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["produkt"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null && (merged[k] == null || merged[k] === '')) merged[k] = v;
        }
        const produktName = raw['produkt'] as string | null;
        if (produktName && !merged['produkt']) {
          const produktMatch = produkteList.find(r => matchName(produktName!, [String(r.fields.produktname ?? '')]));
          if (produktMatch) merged['produkt'] = createRecordUrl(APP_IDS.PRODUKTE, produktMatch.record_id);
        }
        return merged as Partial<Lagerbestand['fields']>;
      });
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
    } finally {
      setScanning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{defaultValues ? 'Lagerbestand bearbeiten' : 'Lagerbestand hinzufügen'}</DialogTitle>
            {enablePhotoScan && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoScan(f);
                    e.target.value = '';
                  }}
                />
                <Button type="button" variant="outline" size="sm" disabled={scanning} onClick={() => fileInputRef.current?.click()}>
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
                  {scanning ? 'Wird erkannt...' : 'Foto scannen'}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="produkt">Produkt</Label>
            <Select
              value={extractRecordId(fields.produkt) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, produkt: v === 'none' ? undefined : createRecordUrl(APP_IDS.PRODUKTE, v) }))}
            >
              <SelectTrigger id="produkt"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {produkteList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.produktname ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lagerort">Lagerort</Label>
            <Select
              value={fields.lagerort ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, lagerort: v === 'none' ? undefined : v as 'regal_a1' | 'regal_a2' | 'regal_b1' | 'regal_b2' | 'hochregal_1' | 'kuehllager' | 'aussenlager' | 'retoure' }))}
            >
              <SelectTrigger id="lagerort"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="regal_a1">Regal A1</SelectItem>
                <SelectItem value="regal_a2">Regal A2</SelectItem>
                <SelectItem value="regal_b1">Regal B1</SelectItem>
                <SelectItem value="regal_b2">Regal B2</SelectItem>
                <SelectItem value="hochregal_1">Hochregal 1</SelectItem>
                <SelectItem value="kuehllager">Kühllager</SelectItem>
                <SelectItem value="aussenlager">Außenlager</SelectItem>
                <SelectItem value="retoure">Retoure</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge">Aktuelle Bestandsmenge</Label>
            <Input
              id="menge"
              type="number"
              value={fields.menge ?? ''}
              onChange={e => setFields(f => ({ ...f, menge: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reserviert">Reservierte Menge</Label>
            <Input
              id="reserviert"
              type="number"
              value={fields.reserviert ?? ''}
              onChange={e => setFields(f => ({ ...f, reserviert: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verfuegbar">Verfügbare Menge</Label>
            <Input
              id="verfuegbar"
              type="number"
              value={fields.verfuegbar ?? ''}
              onChange={e => setFields(f => ({ ...f, verfuegbar: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="letzte_inventur">Letzte Inventur</Label>
            <Input
              id="letzte_inventur"
              type="date"
              value={fields.letzte_inventur ?? ''}
              onChange={e => setFields(f => ({ ...f, letzte_inventur: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              value={fields.notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}