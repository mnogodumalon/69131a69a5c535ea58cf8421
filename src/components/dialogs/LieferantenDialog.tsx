import { useState, useEffect, useRef } from 'react';
import type { Lieferanten } from '@/types/app';
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

interface LieferantenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Lieferanten['fields']) => Promise<void>;
  defaultValues?: Lieferanten['fields'];
  enablePhotoScan?: boolean;
}

export function LieferantenDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = false }: LieferantenDialogProps) {
  const [fields, setFields] = useState<Partial<Lieferanten['fields']>>({});
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
      await onSubmit(fields as Lieferanten['fields']);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    try {
      const uri = await fileToDataUri(file);
      const schema = `{\n  "firmenname": string | null, // Firmenname\n  "lieferantennummer": string | null, // Lieferantennummer\n  "ansprechpartner": string | null, // Ansprechpartner\n  "email": string | null, // E-Mail\n  "telefon": string | null, // Telefon\n  "strasse": string | null, // Straße und Hausnummer\n  "plz": string | null, // Postleitzahl\n  "stadt": string | null, // Stadt\n  "land": string | null, // Land\n  "zahlungsziel": number | null, // Zahlungsziel (Tage)\n  "lieferzeit": number | null, // Durchschnittliche Lieferzeit (Tage)\n  "bewertung": "sehr_gut" | "gut" | "befriedigend" | "ausreichend" | "mangelhaft" | null, // Lieferantenbewertung\n  "notizen": string | null, // Notizen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        for (const [k, v] of Object.entries(raw)) {
          if (v != null && (merged[k] == null || merged[k] === '')) merged[k] = v;
        }
        return merged as Partial<Lieferanten['fields']>;
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
            <DialogTitle>{defaultValues ? 'Lieferanten bearbeiten' : 'Lieferanten hinzufügen'}</DialogTitle>
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
            <Label htmlFor="firmenname">Firmenname</Label>
            <Input
              id="firmenname"
              value={fields.firmenname ?? ''}
              onChange={e => setFields(f => ({ ...f, firmenname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lieferantennummer">Lieferantennummer</Label>
            <Input
              id="lieferantennummer"
              value={fields.lieferantennummer ?? ''}
              onChange={e => setFields(f => ({ ...f, lieferantennummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ansprechpartner">Ansprechpartner</Label>
            <Input
              id="ansprechpartner"
              value={fields.ansprechpartner ?? ''}
              onChange={e => setFields(f => ({ ...f, ansprechpartner: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={fields.email ?? ''}
              onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              value={fields.telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strasse">Straße und Hausnummer</Label>
            <Input
              id="strasse"
              value={fields.strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plz">Postleitzahl</Label>
            <Input
              id="plz"
              value={fields.plz ?? ''}
              onChange={e => setFields(f => ({ ...f, plz: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stadt">Stadt</Label>
            <Input
              id="stadt"
              value={fields.stadt ?? ''}
              onChange={e => setFields(f => ({ ...f, stadt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="land">Land</Label>
            <Input
              id="land"
              value={fields.land ?? ''}
              onChange={e => setFields(f => ({ ...f, land: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zahlungsziel">Zahlungsziel (Tage)</Label>
            <Input
              id="zahlungsziel"
              type="number"
              value={fields.zahlungsziel ?? ''}
              onChange={e => setFields(f => ({ ...f, zahlungsziel: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lieferzeit">Durchschnittliche Lieferzeit (Tage)</Label>
            <Input
              id="lieferzeit"
              type="number"
              value={fields.lieferzeit ?? ''}
              onChange={e => setFields(f => ({ ...f, lieferzeit: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bewertung">Lieferantenbewertung</Label>
            <Select
              value={fields.bewertung ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, bewertung: v === 'none' ? undefined : v as 'sehr_gut' | 'gut' | 'befriedigend' | 'ausreichend' | 'mangelhaft' }))}
            >
              <SelectTrigger id="bewertung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="sehr_gut">Sehr gut ⭐⭐⭐⭐⭐</SelectItem>
                <SelectItem value="gut">Gut ⭐⭐⭐⭐</SelectItem>
                <SelectItem value="befriedigend">Befriedigend ⭐⭐⭐</SelectItem>
                <SelectItem value="ausreichend">Ausreichend ⭐⭐</SelectItem>
                <SelectItem value="mangelhaft">Mangelhaft ⭐</SelectItem>
              </SelectContent>
            </Select>
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