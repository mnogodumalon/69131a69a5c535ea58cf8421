import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isThisWeek, startOfDay, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Plus,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  MapPin,
  Euro,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import type {
  Lieferanten,
  Bestellungen,
  Produkte,
  Lagerbestand,
  Wareneingang,
} from '@/types/app';
import { APP_IDS } from '@/types/app';
import {
  LivingAppsService,
  extractRecordId,
  createRecordUrl,
} from '@/services/livingAppsService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ============ TYPES ============

interface StockHealthData {
  totalProducts: number;
  healthyProducts: number;
  lowStockProducts: LowStockProduct[];
  healthPercentage: number;
}

interface LowStockProduct {
  product: Produkte;
  stock: Lagerbestand;
  deficit: number;
}

interface EnrichedOrder extends Bestellungen {
  supplierName?: string;
  productName?: string;
}

interface EnrichedWareneingang extends Wareneingang {
  productName?: string;
  productUnit?: string;
}

interface ChartDataPoint {
  date: string;
  label: string;
  count: number;
  value: number;
}

// ============ HELPER FUNCTIONS ============

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr.split('T')[0]), 'dd.MM.yyyy', { locale: de });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr.split('T')[0]), 'dd. MMM', { locale: de });
  } catch {
    return dateStr;
  }
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  entwurf: { label: 'Entwurf', variant: 'secondary' },
  bestellt: { label: 'Bestellt', variant: 'default' },
  bestaetigt: { label: 'Bestätigt', variant: 'default' },
  teilweise_geliefert: { label: 'Teilweise', variant: 'outline' },
  geliefert: { label: 'Geliefert', variant: 'secondary' },
  storniert: { label: 'Storniert', variant: 'destructive' },
};

const QUALITY_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  bestanden: { label: 'Bestanden', icon: CheckCircle, color: 'text-green-600' },
  mit_maengeln: { label: 'Mängel', icon: AlertCircle, color: 'text-amber-500' },
  nicht_bestanden: { label: 'Abgelehnt', icon: XCircle, color: 'text-red-500' },
  nicht_geprueft: { label: 'Offen', icon: Clock, color: 'text-muted-foreground' },
};

const LAGERORT_LABELS: Record<string, string> = {
  regal_a1: 'Regal A1',
  regal_a2: 'Regal A2',
  regal_b1: 'Regal B1',
  regal_b2: 'Regal B2',
  hochregal_1: 'Hochregal 1',
  kuehllager: 'Kühllager',
  aussenlager: 'Außenlager',
  retoure: 'Retoure',
};

const EINHEIT_LABELS: Record<string, string> = {
  stueck: 'Stück',
  kg: 'kg',
  g: 'g',
  liter: 'Liter',
  meter: 'Meter',
  karton: 'Karton',
  palette: 'Palette',
};

// ============ LOADING STATE ============

function LoadingState() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Desktop layout */}
        <div className="hidden md:grid md:grid-cols-[65%_35%] gap-5">
          <div className="space-y-5">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <div className="flex gap-3 overflow-hidden">
            <Skeleton className="h-16 w-32 flex-shrink-0 rounded-full" />
            <Skeleton className="h-16 w-32 flex-shrink-0 rounded-full" />
            <Skeleton className="h-16 w-32 flex-shrink-0 rounded-full" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ============ ERROR STATE ============

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Fehler beim Laden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={onRetry} className="w-full">
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ STOCK HEALTH GAUGE ============

function StockHealthGauge({
  healthData,
  onClick,
}: {
  healthData: StockHealthData;
  onClick: () => void;
}) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(healthData.healthPercentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [healthData.healthPercentage]);

  const circumference = 2 * Math.PI * 85;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  const lowStockCount = healthData.lowStockProducts.length;
  const isHealthy = lowStockCount === 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-300 group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          Lagergesundheit
          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-6 md:py-8">
        {/* Gauge Ring */}
        <div className="relative w-[180px] h-[180px] md:w-[200px] md:h-[200px]">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            {/* Background track */}
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="hsl(40 10% 90%)"
              strokeWidth="10"
            />
            {/* Progress ring */}
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke={isHealthy ? 'hsl(152 60% 42%)' : 'hsl(38 92% 50%)'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: isHealthy
                  ? 'drop-shadow(0 0 8px hsl(152 60% 42% / 0.4))'
                  : 'drop-shadow(0 0 8px hsl(38 92% 50% / 0.4))',
              }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-5xl md:text-6xl font-bold tabular-nums"
              style={{ color: isHealthy ? 'hsl(152 60% 42%)' : 'hsl(38 92% 50%)' }}
            >
              {lowStockCount}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {lowStockCount === 1 ? 'Produkt' : 'Produkte'}
            </span>
          </div>
        </div>
        {/* Label */}
        <p className="text-center mt-4 text-sm text-muted-foreground">
          {isHealthy ? (
            <span className="text-green-600 font-medium">Alle Bestände optimal</span>
          ) : (
            <>unter Mindestbestand</>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {healthData.healthyProducts} von {healthData.totalProducts} Produkten gesund
        </p>
      </CardContent>
    </Card>
  );
}

// ============ QUICK STATS ============

function QuickStatPill({
  icon: Icon,
  value,
  label,
  onClick,
}: {
  icon: typeof Package;
  value: number | string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-card rounded-full border border-border hover:border-primary/30 hover:shadow-sm transition-all flex-shrink-0"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
    </button>
  );
}

function QuickStatsStrip({
  openOrdersCount,
  deliveriesTodayCount,
  totalProducts,
  totalLocations,
  onOpenOrdersClick,
}: {
  openOrdersCount: number;
  deliveriesTodayCount: number;
  totalProducts: number;
  totalLocations: number;
  onOpenOrdersClick: () => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:hidden scrollbar-hide">
      <QuickStatPill
        icon={ShoppingCart}
        value={openOrdersCount}
        label="Offene Bestellungen"
        onClick={onOpenOrdersClick}
      />
      <QuickStatPill
        icon={Truck}
        value={deliveriesTodayCount}
        label="Lieferungen heute"
      />
      <QuickStatPill
        icon={Package}
        value={totalProducts}
        label="Produkte"
      />
      <QuickStatPill
        icon={MapPin}
        value={totalLocations}
        label="Lagerorte"
      />
    </div>
  );
}

// ============ DESKTOP STAT CARDS ============

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  onClick,
}: {
  icon: typeof Package;
  title: string;
  value: string | number;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-all`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-2 bg-accent rounded-lg">
            <Icon className="h-4 w-4 text-accent-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ ORDERS TABLE ============

function OrdersTable({
  orders,
  onOrderClick,
}: {
  orders: EnrichedOrder[];
  onOrderClick: (order: EnrichedOrder) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Offene Bestellungen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Bestellnr.</TableHead>
              <TableHead>Lieferant</TableHead>
              <TableHead className="hidden lg:table-cell">Produkt</TableHead>
              <TableHead>Lieferdatum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Keine offenen Bestellungen
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.fields.status || 'entwurf'];
                return (
                  <TableRow
                    key={order.record_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onOrderClick(order)}
                  >
                    <TableCell className="font-medium">
                      {order.fields.bestellnummer || '-'}
                    </TableCell>
                    <TableCell>{order.supplierName || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {order.productName || '-'}
                    </TableCell>
                    <TableCell>
                      {formatDateShort(order.fields.erwartetes_lieferdatum)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant} className="text-xs">
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(order.fields.gesamtpreis)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============ MOBILE ORDERS LIST ============

function OrdersList({
  orders,
  onOrderClick,
  onShowAll,
}: {
  orders: EnrichedOrder[];
  onOrderClick: (order: EnrichedOrder) => void;
  onShowAll: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Offene Bestellungen
          </span>
          <Button variant="ghost" size="sm" onClick={onShowAll} className="text-xs">
            Alle anzeigen
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine offenen Bestellungen
          </p>
        ) : (
          orders.slice(0, 5).map((order) => {
            const statusConfig = STATUS_CONFIG[order.fields.status || 'entwurf'];
            return (
              <div
                key={order.record_id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onOrderClick(order)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {order.fields.bestellnummer}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {order.supplierName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Erwartet: {formatDateShort(order.fields.erwartetes_lieferdatum)}
                  </p>
                </div>
                <Badge variant={statusConfig.variant} className="text-xs ml-2 flex-shrink-0">
                  {statusConfig.label}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ============ WARENEINGANG FEED ============

function WareneingangFeed({
  items,
  onItemClick,
}: {
  items: EnrichedWareneingang[];
  onItemClick: (item: EnrichedWareneingang) => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Letzte Wareneingänge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] md:h-[320px]">
          <div className="space-y-3 pr-4">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Wareneingänge
              </p>
            ) : (
              items.map((item) => {
                const qualityConfig = QUALITY_CONFIG[item.fields.qualitaetspruefung || 'nicht_geprueft'];
                const QualityIcon = qualityConfig.icon;
                return (
                  <div
                    key={item.record_id}
                    className="p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => onItemClick(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {item.productName || 'Unbekanntes Produkt'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.fields.gelieferte_menge} {item.productUnit || 'Stück'}
                          {item.fields.lagerort && ` · ${LAGERORT_LABELS[item.fields.lagerort] || item.fields.lagerort}`}
                        </p>
                      </div>
                      <QualityIcon className={`h-4 w-4 flex-shrink-0 ${qualityConfig.color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(item.fields.lieferdatum)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ============ ORDER TREND CHART ============

function OrderTrendChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <Card className="hidden md:block">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Bestellungen (letzte 30 Tage)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                stroke="hsl(220 10% 50%)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(220 10% 50%)"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0 0% 100%)',
                  border: '1px solid hsl(40 10% 88%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} Bestellungen`, '']}
                labelFormatter={(label) => `Datum: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(38 92% 50%)"
                strokeWidth={2}
                fill="url(#orderGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ LOW STOCK SHEET ============

function LowStockSheet({
  open,
  onOpenChange,
  lowStockProducts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lowStockProducts: LowStockProduct[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] md:h-[70vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Produkte unter Mindestbestand
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full mt-4 pb-8">
          <div className="space-y-3 pr-4">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-medium">Alle Bestände sind optimal!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Keine Produkte unter Mindestbestand
                </p>
              </div>
            ) : (
              lowStockProducts.map(({ product, stock, deficit }) => (
                <Card key={product.record_id} className="border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{product.fields.produktname}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Art.-Nr.: {product.fields.artikelnummer || '-'}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-amber-500 text-amber-700">
                        -{deficit} {EINHEIT_LABELS[product.fields.einheit || 'stueck']}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Aktuell</p>
                        <p className="font-medium text-red-600">
                          {stock.fields.menge ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Minimum</p>
                        <p className="font-medium">
                          {product.fields.mindestbestand ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Lagerort</p>
                        <p className="font-medium">
                          {LAGERORT_LABELS[stock.fields.lagerort || ''] || '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ============ ORDER DETAIL DIALOG ============

function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: {
  order: EnrichedOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!order) return null;

  const statusConfig = STATUS_CONFIG[order.fields.status || 'entwurf'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Bestellung {order.fields.bestellnummer}
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Lieferant</p>
              <p className="font-medium">{order.supplierName || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Produkt</p>
              <p className="font-medium">{order.productName || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Bestelldatum</p>
              <p className="font-medium">{formatDate(order.fields.bestelldatum)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Erw. Lieferdatum</p>
              <p className="font-medium">{formatDate(order.fields.erwartetes_lieferdatum)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Menge</p>
              <p className="font-medium">{order.fields.bestellmenge ?? '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Preis/Einheit</p>
              <p className="font-medium">{formatCurrency(order.fields.preis_pro_einheit)}</p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Gesamtpreis</span>
              <span className="text-xl font-bold">{formatCurrency(order.fields.gesamtpreis)}</span>
            </div>
          </div>
          {order.fields.notizen && (
            <div className="pt-4 border-t">
              <p className="text-muted-foreground text-xs mb-1">Notizen</p>
              <p className="text-sm">{order.fields.notizen}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ WARENEINGANG DETAIL DIALOG ============

function WareneingangDetailDialog({
  item,
  open,
  onOpenChange,
}: {
  item: EnrichedWareneingang | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  const qualityConfig = QUALITY_CONFIG[item.fields.qualitaetspruefung || 'nicht_geprueft'];
  const QualityIcon = qualityConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wareneingang Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">{item.productName || 'Produkt'}</p>
              <p className="text-sm text-muted-foreground">
                {item.fields.gelieferte_menge} {item.productUnit || 'Stück'}
              </p>
            </div>
            <div className={`flex items-center gap-1.5 ${qualityConfig.color}`}>
              <QualityIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{qualityConfig.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Lieferdatum</p>
              <p className="font-medium">{formatDate(item.fields.lieferdatum)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Lagerort</p>
              <p className="font-medium">
                {LAGERORT_LABELS[item.fields.lagerort || ''] || '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Lieferschein-Nr.</p>
              <p className="font-medium">{item.fields.lieferscheinnummer || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Erfasst von</p>
              <p className="font-medium">{item.fields.erfasst_von || '-'}</p>
            </div>
          </div>

          {item.fields.abweichungen && (
            <div className="pt-4 border-t">
              <p className="text-muted-foreground text-xs mb-1">Abweichungen</p>
              <p className="text-sm">{item.fields.abweichungen}</p>
            </div>
          )}

          {item.fields.notizen && (
            <div className="pt-4 border-t">
              <p className="text-muted-foreground text-xs mb-1">Notizen</p>
              <p className="text-sm">{item.fields.notizen}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ ALL ORDERS DIALOG ============

function AllOrdersDialog({
  orders,
  open,
  onOpenChange,
  onOrderClick,
}: {
  orders: EnrichedOrder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderClick: (order: EnrichedOrder) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Alle offenen Bestellungen</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bestellnr.</TableHead>
                <TableHead>Lieferant</TableHead>
                <TableHead>Lieferdatum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.fields.status || 'entwurf'];
                return (
                  <TableRow
                    key={order.record_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      onOpenChange(false);
                      onOrderClick(order);
                    }}
                  >
                    <TableCell className="font-medium">
                      {order.fields.bestellnummer || '-'}
                    </TableCell>
                    <TableCell>{order.supplierName || '-'}</TableCell>
                    <TableCell>
                      {formatDate(order.fields.erwartetes_lieferdatum)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant} className="text-xs">
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(order.fields.gesamtpreis)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ============ ADD WARENEINGANG FORM ============

function AddWareneingangForm({
  open,
  onOpenChange,
  openOrders,
  products,
  suppliers,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openOrders: EnrichedOrder[];
  products: Produkte[];
  suppliers: Lieferanten[];
  onSuccess: () => void;
}) {
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [lieferdatum, setLieferdatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [menge, setMenge] = useState('');
  const [lagerort, setLagerort] = useState<string>('');
  const [qualitaet, setQualitaet] = useState<string>('nicht_geprueft');
  const [lieferschein, setLieferschein] = useState('');
  const [erfasstVon, setErfasstVon] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill from selected order
  useEffect(() => {
    if (selectedOrder) {
      const order = openOrders.find((o) => o.record_id === selectedOrder);
      if (order) {
        const productId = extractRecordId(order.fields.produkt);
        const supplierId = extractRecordId(order.fields.lieferant);
        if (productId) setSelectedProduct(productId);
        if (supplierId) setSelectedSupplier(supplierId);
      }
    }
  }, [selectedOrder, openOrders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !menge || !lagerort) return;

    setSubmitting(true);
    try {
      const now = new Date();
      const erfassungsdatum = `${format(now, 'yyyy-MM-dd')}T${format(now, 'HH:mm')}`;

      await LivingAppsService.createWareneingangEntry({
        bestellung: selectedOrder
          ? createRecordUrl(APP_IDS.BESTELLUNGEN, selectedOrder)
          : undefined,
        produkt: createRecordUrl(APP_IDS.PRODUKTE, selectedProduct),
        lieferant: selectedSupplier
          ? createRecordUrl(APP_IDS.LIEFERANTEN, selectedSupplier)
          : undefined,
        lieferdatum,
        gelieferte_menge: parseFloat(menge),
        lagerort: lagerort as Wareneingang['fields']['lagerort'],
        qualitaetspruefung: qualitaet as Wareneingang['fields']['qualitaetspruefung'],
        lieferscheinnummer: lieferschein || undefined,
        erfasst_von: erfasstVon || undefined,
        erfassungsdatum,
      });

      // Reset form
      setSelectedOrder('');
      setSelectedProduct('');
      setSelectedSupplier('');
      setLieferdatum(format(new Date(), 'yyyy-MM-dd'));
      setMenge('');
      setLagerort('');
      setQualitaet('nicht_geprueft');
      setLieferschein('');
      setErfasstVon('');

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to create Wareneingang:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Wareneingang erfassen
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Bestellung (optional) */}
          <div className="space-y-2">
            <Label htmlFor="order">Bestellung (optional)</Label>
            <Select value={selectedOrder} onValueChange={setSelectedOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Bestellung auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Bestellung</SelectItem>
                {openOrders.map((order) => (
                  <SelectItem key={order.record_id} value={order.record_id}>
                    {order.fields.bestellnummer} - {order.supplierName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Produkt */}
          <div className="space-y-2">
            <Label htmlFor="product">Produkt *</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Produkt auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.record_id} value={product.record_id}>
                    {product.fields.produktname} ({product.fields.artikelnummer})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lieferant */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Lieferant</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Lieferant auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Lieferant</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.record_id} value={supplier.record_id}>
                    {supplier.fields.firmenname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Lieferdatum */}
            <div className="space-y-2">
              <Label htmlFor="date">Lieferdatum *</Label>
              <Input
                id="date"
                type="date"
                value={lieferdatum}
                onChange={(e) => setLieferdatum(e.target.value)}
                required
              />
            </div>

            {/* Menge */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Menge *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                value={menge}
                onChange={(e) => setMenge(e.target.value)}
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Lagerort */}
          <div className="space-y-2">
            <Label htmlFor="location">Lagerort *</Label>
            <Select value={lagerort} onValueChange={setLagerort}>
              <SelectTrigger>
                <SelectValue placeholder="Lagerort auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LAGERORT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Qualitätsprüfung */}
          <div className="space-y-2">
            <Label htmlFor="quality">Qualitätsprüfung</Label>
            <Select value={qualitaet} onValueChange={setQualitaet}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bestanden">Bestanden</SelectItem>
                <SelectItem value="mit_maengeln">Mit Mängeln</SelectItem>
                <SelectItem value="nicht_bestanden">Nicht bestanden</SelectItem>
                <SelectItem value="nicht_geprueft">Nicht geprüft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Lieferscheinnummer */}
            <div className="space-y-2">
              <Label htmlFor="delivery-note">Lieferschein-Nr.</Label>
              <Input
                id="delivery-note"
                value={lieferschein}
                onChange={(e) => setLieferschein(e.target.value)}
                placeholder="LS-12345"
              />
            </div>

            {/* Erfasst von */}
            <div className="space-y-2">
              <Label htmlFor="recorded-by">Erfasst von</Label>
              <Input
                id="recorded-by"
                value={erfasstVon}
                onChange={(e) => setErfasstVon(e.target.value)}
                placeholder="Name"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-6"
            disabled={submitting || !selectedProduct || !menge || !lagerort}
          >
            {submitting ? 'Wird gespeichert...' : 'Wareneingang speichern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ MAIN DASHBOARD ============

export default function Dashboard() {
  // Data state
  const [lieferanten, setLieferanten] = useState<Lieferanten[]>([]);
  const [bestellungen, setBestellungen] = useState<Bestellungen[]>([]);
  const [produkte, setProdukte] = useState<Produkte[]>([]);
  const [lagerbestand, setLagerbestand] = useState<Lagerbestand[]>([]);
  const [wareneingang, setWareneingang] = useState<Wareneingang[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Dialog/Sheet state
  const [lowStockSheetOpen, setLowStockSheetOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<EnrichedOrder | null>(null);
  const [selectedWareneingang, setSelectedWareneingang] = useState<EnrichedWareneingang | null>(null);
  const [allOrdersDialogOpen, setAllOrdersDialogOpen] = useState(false);
  const [addWareneingangOpen, setAddWareneingangOpen] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [l, b, p, lb, we] = await Promise.all([
        LivingAppsService.getLieferanten(),
        LivingAppsService.getBestellungen(),
        LivingAppsService.getProdukte(),
        LivingAppsService.getLagerbestand(),
        LivingAppsService.getWareneingang(),
      ]);
      setLieferanten(l);
      setBestellungen(b);
      setProdukte(p);
      setLagerbestand(lb);
      setWareneingang(we);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unbekannter Fehler'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Create lookup maps
  const supplierMap = useMemo(() => {
    const map = new Map<string, Lieferanten>();
    lieferanten.forEach((s) => map.set(s.record_id, s));
    return map;
  }, [lieferanten]);

  const productMap = useMemo(() => {
    const map = new Map<string, Produkte>();
    produkte.forEach((p) => map.set(p.record_id, p));
    return map;
  }, [produkte]);

  // Calculate stock health
  const stockHealthData = useMemo<StockHealthData>(() => {
    const lowStockProducts: LowStockProduct[] = [];

    lagerbestand.forEach((stock) => {
      const productId = extractRecordId(stock.fields.produkt);
      if (!productId) return;

      const product = productMap.get(productId);
      if (!product) return;

      const currentStock = stock.fields.menge ?? 0;
      const minStock = product.fields.mindestbestand ?? 0;

      if (currentStock < minStock) {
        lowStockProducts.push({
          product,
          stock,
          deficit: minStock - currentStock,
        });
      }
    });

    // Sort by deficit (highest first)
    lowStockProducts.sort((a, b) => b.deficit - a.deficit);

    const totalProducts = produkte.filter(p => p.fields.aktiv === 'aktiv').length || produkte.length;
    const healthyProducts = totalProducts - lowStockProducts.length;
    const healthPercentage = totalProducts > 0 ? (healthyProducts / totalProducts) * 100 : 100;

    return {
      totalProducts,
      healthyProducts,
      lowStockProducts,
      healthPercentage,
    };
  }, [lagerbestand, productMap, produkte]);

  // Enrich orders with supplier/product names
  const enrichedOrders = useMemo<EnrichedOrder[]>(() => {
    return bestellungen.map((order) => {
      const supplierId = extractRecordId(order.fields.lieferant);
      const productId = extractRecordId(order.fields.produkt);

      return {
        ...order,
        supplierName: supplierId ? supplierMap.get(supplierId)?.fields.firmenname : undefined,
        productName: productId ? productMap.get(productId)?.fields.produktname : undefined,
      };
    });
  }, [bestellungen, supplierMap, productMap]);

  // Filter open orders
  const openOrders = useMemo(() => {
    return enrichedOrders
      .filter((order) => {
        const status = order.fields.status;
        return status && !['geliefert', 'storniert'].includes(status);
      })
      .sort((a, b) => {
        const dateA = a.fields.erwartetes_lieferdatum || '';
        const dateB = b.fields.erwartetes_lieferdatum || '';
        return dateA.localeCompare(dateB);
      });
  }, [enrichedOrders]);

  // Calculate open orders value
  const openOrdersValue = useMemo(() => {
    return openOrders.reduce((sum, order) => sum + (order.fields.gesamtpreis || 0), 0);
  }, [openOrders]);

  // Count deliveries expected this week
  const deliveriesThisWeek = useMemo(() => {
    return openOrders.filter((order) => {
      if (!order.fields.erwartetes_lieferdatum) return false;
      try {
        return isThisWeek(parseISO(order.fields.erwartetes_lieferdatum));
      } catch {
        return false;
      }
    }).length;
  }, [openOrders]);

  // Enrich Wareneingang with product names
  const enrichedWareneingang = useMemo<EnrichedWareneingang[]>(() => {
    return wareneingang
      .map((we) => {
        const productId = extractRecordId(we.fields.produkt);
        const product = productId ? productMap.get(productId) : null;

        return {
          ...we,
          productName: product?.fields.produktname,
          productUnit: product?.fields.einheit
            ? EINHEIT_LABELS[product.fields.einheit]
            : undefined,
        };
      })
      .sort((a, b) => {
        const dateA = a.fields.erfassungsdatum || a.fields.lieferdatum || '';
        const dateB = b.fields.erfassungsdatum || b.fields.lieferdatum || '';
        return dateB.localeCompare(dateA);
      })
      .slice(0, 10);
  }, [wareneingang, productMap]);

  // Calculate chart data (orders over last 30 days)
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 30);

    // Initialize all days
    const dayMap = new Map<string, { count: number; value: number }>();
    for (let i = 0; i <= 30; i++) {
      const date = subDays(today, 30 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      dayMap.set(dateStr, { count: 0, value: 0 });
    }

    // Count orders per day
    bestellungen.forEach((order) => {
      if (!order.fields.bestelldatum) return;
      const orderDate = order.fields.bestelldatum.split('T')[0];
      const existing = dayMap.get(orderDate);
      if (existing) {
        existing.count += 1;
        existing.value += order.fields.gesamtpreis || 0;
      }
    });

    return Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      label: format(parseISO(date), 'dd.MM'),
      count: data.count,
      value: data.value,
    }));
  }, [bestellungen]);

  // Get unique storage locations count
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    lagerbestand.forEach((stock) => {
      if (stock.fields.lagerort) {
        locations.add(stock.fields.lagerort);
      }
    });
    return locations.size;
  }, [lagerbestand]);

  // Loading state
  if (loading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  const todayFormatted = format(new Date(), "d. MMM yyyy", { locale: de });

  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            Lagerverwaltung
          </h1>
          <span className="text-sm text-muted-foreground">{todayFormatted}</span>
        </header>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-4">
          {/* Hero: Stock Health Gauge */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StockHealthGauge
              healthData={stockHealthData}
              onClick={() => setLowStockSheetOpen(true)}
            />
          </div>

          {/* Quick Stats Strip */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <QuickStatsStrip
              openOrdersCount={openOrders.length}
              deliveriesTodayCount={deliveriesThisWeek}
              totalProducts={produkte.length}
              totalLocations={uniqueLocations}
              onOpenOrdersClick={() => setAllOrdersDialogOpen(true)}
            />
          </div>

          {/* Orders List */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <OrdersList
              orders={openOrders}
              onOrderClick={setSelectedOrder}
              onShowAll={() => setAllOrdersDialogOpen(true)}
            />
          </div>

          {/* Wareneingang Feed */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <WareneingangFeed
              items={enrichedWareneingang}
              onItemClick={setSelectedWareneingang}
            />
          </div>
        </div>

        {/* Desktop Layout: 65/35 split */}
        <div className="hidden md:grid md:grid-cols-[65%_35%] gap-5">
          {/* Left Column (65%) */}
          <div className="space-y-5">
            {/* Hero: Stock Health Gauge */}
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <StockHealthGauge
                healthData={stockHealthData}
                onClick={() => setLowStockSheetOpen(true)}
              />
            </div>

            {/* Orders Table */}
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
              <OrdersTable
                orders={openOrders.slice(0, 10)}
                onOrderClick={setSelectedOrder}
              />
            </div>

            {/* Order Trend Chart */}
            <div className="animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
              <OrderTrendChart data={chartData} />
            </div>
          </div>

          {/* Right Column (35%) */}
          <div className="space-y-5">
            {/* Quick Stats */}
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StatCard
                icon={ShoppingCart}
                title="Offene Bestellungen"
                value={openOrders.length}
                subtitle={`Wert: ${formatCurrency(openOrdersValue)}`}
                onClick={() => setAllOrdersDialogOpen(true)}
              />
            </div>

            <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-75">
              <StatCard
                icon={Truck}
                title="Lieferungen diese Woche"
                value={deliveriesThisWeek}
              />
            </div>

            <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
              <StatCard
                icon={Package}
                title="Produkte"
                value={produkte.length}
                subtitle={`${uniqueLocations} Lagerorte`}
              />
            </div>

            {/* Wareneingang Feed */}
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-150">
              <WareneingangFeed
                items={enrichedWareneingang}
                onItemClick={setSelectedWareneingang}
              />
            </div>

            {/* Desktop Action Button */}
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
              <Button
                className="w-full h-12 text-base shadow-lg"
                style={{
                  boxShadow: '0 4px 14px hsl(38 92% 50% / 0.4)',
                }}
                onClick={() => setAddWareneingangOpen(true)}
              >
                <Plus className="h-5 w-5 mr-2" />
                Wareneingang erfassen
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Action */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
        <Button
          className="w-full h-14 text-base shadow-lg"
          style={{
            boxShadow: '0 4px 14px hsl(38 92% 50% / 0.4)',
          }}
          onClick={() => setAddWareneingangOpen(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Wareneingang erfassen
        </Button>
      </div>

      {/* Dialogs & Sheets */}
      <LowStockSheet
        open={lowStockSheetOpen}
        onOpenChange={setLowStockSheetOpen}
        lowStockProducts={stockHealthData.lowStockProducts}
      />

      <OrderDetailDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      />

      <WareneingangDetailDialog
        item={selectedWareneingang}
        open={!!selectedWareneingang}
        onOpenChange={(open) => !open && setSelectedWareneingang(null)}
      />

      <AllOrdersDialog
        orders={openOrders}
        open={allOrdersDialogOpen}
        onOpenChange={setAllOrdersDialogOpen}
        onOrderClick={setSelectedOrder}
      />

      <AddWareneingangForm
        open={addWareneingangOpen}
        onOpenChange={setAddWareneingangOpen}
        openOrders={openOrders}
        products={produkte}
        suppliers={lieferanten}
        onSuccess={fetchData}
      />
    </div>
  );
}
