import { useState, useEffect, useRef } from 'react';
import type { Wareneingang, Bestellungen, Produkte, Lieferanten } from '@/types/app';
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

interface WareneingangDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Wareneingang['fields']) => Promise<void>;
  defaultValues?: Wareneingang['fields'];
  bestellungenList: Bestellungen[];
  produkteList: Produkte[];
  lieferantenList: Lieferanten[];
  enablePhotoScan?: boolean;
}

export function WareneingangDialog({ open, onClose, onSubmit, defaultValues, bestellungenList, produkteList, lieferantenList, enablePhotoScan = false }: WareneingangDialogProps) {
  const [fields, setFields] = useState<Partial<Wareneingang['fields']>>({});
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
      await onSubmit(fields as Wareneingang['fields']);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    try {
      const uri = await fileToDataUri(file);
      const schema = `{\n  "bestellung": string | null, // Name des Bestellungen-Eintrags (z.B. "Jonas Schmidt")\n  "produkt": string | null, // Name des Produkte-Eintrags (z.B. "Jonas Schmidt")\n  "lieferant": string | null, // Name des Lieferanten-Eintrags (z.B. "Jonas Schmidt")\n  "lieferdatum": string | null, // YYYY-MM-DD // Lieferdatum\n  "gelieferte_menge": number | null, // Gelieferte Menge\n  "lagerort": "regal_a1" | "regal_a2" | "regal_b1" | "regal_b2" | "hochregal_1" | "kuehllager" | "aussenlager" | "retoure" | null, // Lagerort\n  "qualitaetspruefung": "bestanden" | "mit_maengeln" | "nicht_bestanden" | "nicht_geprueft" | null, // Qualitätsprüfung\n  "abweichungen": string | null, // Abweichungen\n  "lieferscheinnummer": string | null, // Lieferscheinnummer\n  "erfasst_von": string | null, // Erfasst von\n  "erfassungsdatum": string | null, // YYYY-MM-DDTHH:MM // Erfassungsdatum\n  "notizen": string | null, // Notizen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["bestellung", "produkt", "lieferant"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null && (merged[k] == null || merged[k] === '')) merged[k] = v;
        }
        const bestellungName = raw['bestellung'] as string | null;
        if (bestellungName && !merged['bestellung']) {
          const bestellungMatch = bestellungenList.find(r => matchName(bestellungName!, [String(r.fields.bestellnummer ?? '')]));
          if (bestellungMatch) merged['bestellung'] = createRecordUrl(APP_IDS.BESTELLUNGEN, bestellungMatch.record_id);
        }
        const produktName = raw['produkt'] as string | null;
        if (produktName && !merged['produkt']) {
          const produktMatch = produkteList.find(r => matchName(produktName!, [String(r.fields.produktname ?? '')]));
          if (produktMatch) merged['produkt'] = createRecordUrl(APP_IDS.PRODUKTE, produktMatch.record_id);
        }
        const lieferantName = raw['lieferant'] as string | null;
        if (lieferantName && !merged['lieferant']) {
          const lieferantMatch = lieferantenList.find(r => matchName(lieferantName!, [String(r.fields.firmenname ?? '')]));
          if (lieferantMatch) merged['lieferant'] = createRecordUrl(APP_IDS.LIEFERANTEN, lieferantMatch.record_id);
        }
        return merged as Partial<Wareneingang['fields']>;
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
            <DialogTitle>{defaultValues ? 'Wareneingang bearbeiten' : 'Wareneingang hinzufügen'}</DialogTitle>
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
            <Label htmlFor="bestellung">Bestellung</Label>
            <Select
              value={extractRecordId(fields.bestellung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, bestellung: v === 'none' ? undefined : createRecordUrl(APP_IDS.BESTELLUNGEN, v) }))}
            >
              <SelectTrigger id="bestellung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {bestellungenList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.bestellnummer ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Label htmlFor="lieferant">Lieferant</Label>
            <Select
              value={extractRecordId(fields.lieferant) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, lieferant: v === 'none' ? undefined : createRecordUrl(APP_IDS.LIEFERANTEN, v) }))}
            >
              <SelectTrigger id="lieferant"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {lieferantenList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.firmenname ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lieferdatum">Lieferdatum</Label>
            <Input
              id="lieferdatum"
              type="date"
              value={fields.lieferdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, lieferdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gelieferte_menge">Gelieferte Menge</Label>
            <Input
              id="gelieferte_menge"
              type="number"
              value={fields.gelieferte_menge ?? ''}
              onChange={e => setFields(f => ({ ...f, gelieferte_menge: e.target.value ? Number(e.target.value) : undefined }))}
            />
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
            <Label htmlFor="qualitaetspruefung">Qualitätsprüfung</Label>
            <Select
              value={fields.qualitaetspruefung ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, qualitaetspruefung: v === 'none' ? undefined : v as 'bestanden' | 'mit_maengeln' | 'nicht_bestanden' | 'nicht_geprueft' }))}
            >
              <SelectTrigger id="qualitaetspruefung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="bestanden">Bestanden ✅</SelectItem>
                <SelectItem value="mit_maengeln">Mit Mängeln ⚠️</SelectItem>
                <SelectItem value="nicht_bestanden">Nicht bestanden ❌</SelectItem>
                <SelectItem value="nicht_geprueft">Nicht geprüft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="abweichungen">Abweichungen</Label>
            <Textarea
              id="abweichungen"
              value={fields.abweichungen ?? ''}
              onChange={e => setFields(f => ({ ...f, abweichungen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lieferscheinnummer">Lieferscheinnummer</Label>
            <Input
              id="lieferscheinnummer"
              value={fields.lieferscheinnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, lieferscheinnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="erfasst_von">Erfasst von</Label>
            <Input
              id="erfasst_von"
              value={fields.erfasst_von ?? ''}
              onChange={e => setFields(f => ({ ...f, erfasst_von: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="erfassungsdatum">Erfassungsdatum</Label>
            <Input
              id="erfassungsdatum"
              type="datetime-local"
              step="60"
              value={fields.erfassungsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, erfassungsdatum: e.target.value }))}
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