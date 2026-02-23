import { useState, useEffect, useRef } from 'react';
import type { Bestellungen, Lieferanten, Produkte } from '@/types/app';
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

interface BestellungenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Bestellungen['fields']) => Promise<void>;
  defaultValues?: Bestellungen['fields'];
  lieferantenList: Lieferanten[];
  produkteList: Produkte[];
  enablePhotoScan?: boolean;
}

export function BestellungenDialog({ open, onClose, onSubmit, defaultValues, lieferantenList, produkteList, enablePhotoScan = false }: BestellungenDialogProps) {
  const [fields, setFields] = useState<Partial<Bestellungen['fields']>>({});
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
      await onSubmit(fields as Bestellungen['fields']);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    try {
      const uri = await fileToDataUri(file);
      const schema = `{\n  "bestellnummer": string | null, // Bestellnummer\n  "lieferant": string | null, // Name des Lieferanten-Eintrags (z.B. "Jonas Schmidt")\n  "produkt": string | null, // Name des Produkte-Eintrags (z.B. "Jonas Schmidt")\n  "bestellmenge": number | null, // Bestellmenge\n  "preis_pro_einheit": number | null, // Preis pro Einheit (EUR)\n  "gesamtpreis": number | null, // Gesamtpreis (EUR)\n  "bestelldatum": string | null, // YYYY-MM-DD // Bestelldatum\n  "erwartetes_lieferdatum": string | null, // YYYY-MM-DD // Erwartetes Lieferdatum\n  "status": "entwurf" | "bestellt" | "bestaetigt" | "teilweise_geliefert" | "geliefert" | "storniert" | null, // Bestellstatus\n  "lieferantenbestellung": string | null, // Bestellnummer beim Lieferanten\n  "notizen": string | null, // Notizen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["lieferant", "produkt"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null && (merged[k] == null || merged[k] === '')) merged[k] = v;
        }
        const lieferantName = raw['lieferant'] as string | null;
        if (lieferantName && !merged['lieferant']) {
          const lieferantMatch = lieferantenList.find(r => matchName(lieferantName!, [String(r.fields.firmenname ?? '')]));
          if (lieferantMatch) merged['lieferant'] = createRecordUrl(APP_IDS.LIEFERANTEN, lieferantMatch.record_id);
        }
        const produktName = raw['produkt'] as string | null;
        if (produktName && !merged['produkt']) {
          const produktMatch = produkteList.find(r => matchName(produktName!, [String(r.fields.produktname ?? '')]));
          if (produktMatch) merged['produkt'] = createRecordUrl(APP_IDS.PRODUKTE, produktMatch.record_id);
        }
        return merged as Partial<Bestellungen['fields']>;
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
            <DialogTitle>{defaultValues ? 'Bestellungen bearbeiten' : 'Bestellungen hinzufügen'}</DialogTitle>
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
            <Label htmlFor="bestellnummer">Bestellnummer</Label>
            <Input
              id="bestellnummer"
              value={fields.bestellnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, bestellnummer: e.target.value }))}
            />
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
            <Label htmlFor="bestellmenge">Bestellmenge</Label>
            <Input
              id="bestellmenge"
              type="number"
              value={fields.bestellmenge ?? ''}
              onChange={e => setFields(f => ({ ...f, bestellmenge: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preis_pro_einheit">Preis pro Einheit (EUR)</Label>
            <Input
              id="preis_pro_einheit"
              type="number"
              value={fields.preis_pro_einheit ?? ''}
              onChange={e => setFields(f => ({ ...f, preis_pro_einheit: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtpreis">Gesamtpreis (EUR)</Label>
            <Input
              id="gesamtpreis"
              type="number"
              value={fields.gesamtpreis ?? ''}
              onChange={e => setFields(f => ({ ...f, gesamtpreis: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bestelldatum">Bestelldatum</Label>
            <Input
              id="bestelldatum"
              type="date"
              value={fields.bestelldatum ?? ''}
              onChange={e => setFields(f => ({ ...f, bestelldatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="erwartetes_lieferdatum">Erwartetes Lieferdatum</Label>
            <Input
              id="erwartetes_lieferdatum"
              type="date"
              value={fields.erwartetes_lieferdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, erwartetes_lieferdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Bestellstatus</Label>
            <Select
              value={fields.status ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, status: v === 'none' ? undefined : v as 'entwurf' | 'bestellt' | 'bestaetigt' | 'teilweise_geliefert' | 'geliefert' | 'storniert' }))}
            >
              <SelectTrigger id="status"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="entwurf">Entwurf</SelectItem>
                <SelectItem value="bestellt">Bestellt</SelectItem>
                <SelectItem value="bestaetigt">Bestätigt</SelectItem>
                <SelectItem value="teilweise_geliefert">Teilweise geliefert</SelectItem>
                <SelectItem value="geliefert">Geliefert</SelectItem>
                <SelectItem value="storniert">Storniert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lieferantenbestellung">Bestellnummer beim Lieferanten</Label>
            <Input
              id="lieferantenbestellung"
              value={fields.lieferantenbestellung ?? ''}
              onChange={e => setFields(f => ({ ...f, lieferantenbestellung: e.target.value }))}
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