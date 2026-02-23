import { useState, useEffect, useRef } from 'react';
import type { Produkte } from '@/types/app';
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

interface ProdukteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Produkte['fields']) => Promise<void>;
  defaultValues?: Produkte['fields'];
  enablePhotoScan?: boolean;
}

export function ProdukteDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = false }: ProdukteDialogProps) {
  const [fields, setFields] = useState<Partial<Produkte['fields']>>({});
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
      await onSubmit(fields as Produkte['fields']);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    try {
      const uri = await fileToDataUri(file);
      const schema = `{\n  "produktname": string | null, // Produktname\n  "artikelnummer": string | null, // Artikelnummer\n  "beschreibung": string | null, // Beschreibung\n  "kategorie": "elektronik" | "lebensmittel" | "kleidung" | "moebel" | "werkzeuge" | "buero" | "spielwaren" | "sonstiges" | null, // Kategorie\n  "einkaufspreis": number | null, // Einkaufspreis (EUR)\n  "verkaufspreis": number | null, // Verkaufspreis (EUR)\n  "mindestbestand": number | null, // Mindestbestand\n  "einheit": "stueck" | "kg" | "g" | "liter" | "meter" | "karton" | "palette" | null, // Einheit\n  "barcode": string | null, // Barcode\n  "bild_url": string | null, // Bild-URL\n  "aktiv": "aktiv" | "inaktiv" | "auslaufend" | null, // Produktstatus\n}`;
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
        return merged as Partial<Produkte['fields']>;
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
            <DialogTitle>{defaultValues ? 'Produkte bearbeiten' : 'Produkte hinzufügen'}</DialogTitle>
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
            <Label htmlFor="produktname">Produktname</Label>
            <Input
              id="produktname"
              value={fields.produktname ?? ''}
              onChange={e => setFields(f => ({ ...f, produktname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artikelnummer">Artikelnummer</Label>
            <Input
              id="artikelnummer"
              value={fields.artikelnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, artikelnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kategorie">Kategorie</Label>
            <Select
              value={fields.kategorie ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, kategorie: v === 'none' ? undefined : v as 'elektronik' | 'lebensmittel' | 'kleidung' | 'moebel' | 'werkzeuge' | 'buero' | 'spielwaren' | 'sonstiges' }))}
            >
              <SelectTrigger id="kategorie"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="elektronik">Elektronik</SelectItem>
                <SelectItem value="lebensmittel">Lebensmittel</SelectItem>
                <SelectItem value="kleidung">Kleidung</SelectItem>
                <SelectItem value="moebel">Möbel</SelectItem>
                <SelectItem value="werkzeuge">Werkzeuge</SelectItem>
                <SelectItem value="buero">Bürobedarf</SelectItem>
                <SelectItem value="spielwaren">Spielwaren</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="einkaufspreis">Einkaufspreis (EUR)</Label>
            <Input
              id="einkaufspreis"
              type="number"
              value={fields.einkaufspreis ?? ''}
              onChange={e => setFields(f => ({ ...f, einkaufspreis: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verkaufspreis">Verkaufspreis (EUR)</Label>
            <Input
              id="verkaufspreis"
              type="number"
              value={fields.verkaufspreis ?? ''}
              onChange={e => setFields(f => ({ ...f, verkaufspreis: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mindestbestand">Mindestbestand</Label>
            <Input
              id="mindestbestand"
              type="number"
              value={fields.mindestbestand ?? ''}
              onChange={e => setFields(f => ({ ...f, mindestbestand: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="einheit">Einheit</Label>
            <Select
              value={fields.einheit ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, einheit: v === 'none' ? undefined : v as 'stueck' | 'kg' | 'g' | 'liter' | 'meter' | 'karton' | 'palette' }))}
            >
              <SelectTrigger id="einheit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="stueck">Stück</SelectItem>
                <SelectItem value="kg">Kilogramm</SelectItem>
                <SelectItem value="g">Gramm</SelectItem>
                <SelectItem value="liter">Liter</SelectItem>
                <SelectItem value="meter">Meter</SelectItem>
                <SelectItem value="karton">Karton</SelectItem>
                <SelectItem value="palette">Palette</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={fields.barcode ?? ''}
              onChange={e => setFields(f => ({ ...f, barcode: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bild_url">Bild-URL</Label>
            <Input
              id="bild_url"
              value={fields.bild_url ?? ''}
              onChange={e => setFields(f => ({ ...f, bild_url: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aktiv">Produktstatus</Label>
            <Select
              value={fields.aktiv ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, aktiv: v === 'none' ? undefined : v as 'aktiv' | 'inaktiv' | 'auslaufend' }))}
            >
              <SelectTrigger id="aktiv"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="aktiv">Aktiv</SelectItem>
                <SelectItem value="inaktiv">Inaktiv</SelectItem>
                <SelectItem value="auslaufend">Auslaufend</SelectItem>
              </SelectContent>
            </Select>
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