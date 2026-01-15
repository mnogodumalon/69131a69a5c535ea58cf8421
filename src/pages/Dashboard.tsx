import { useCallback, useEffect, useMemo, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import type {
  Bestellungen,
  Lagerbestand,
  Lieferanten,
  Produkte,
  Wareneingang,
} from "@/types/app"
import { APP_IDS } from "@/types/app"
import {
  LivingAppsService,
  createRecordUrl,
  extractRecordId,
} from "@/services/livingAppsService"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { format, isBefore, parseISO, subDays } from "date-fns"
import { de } from "date-fns/locale"

type WareneingangFormState = {
  bestellungId: string
  produktId: string
  lieferantId: string
  lieferdatum: string
  gelieferteMenge: string
  lagerort: string
  qualitaetspruefung: string
  lieferscheinnummer: string
  erfasstVon: string
  erfassungsdatum: string
  abweichungen: string
  notizen: string
}

const initialFormState: WareneingangFormState = {
  bestellungId: "",
  produktId: "",
  lieferantId: "",
  lieferdatum: "",
  gelieferteMenge: "",
  lagerort: "",
  qualitaetspruefung: "",
  lieferscheinnummer: "",
  erfasstVon: "",
  erfassungsdatum: "",
  abweichungen: "",
  notizen: "",
}

const openStatusKeys = [
  "entwurf",
  "bestellt",
  "bestaetigt",
  "teilweise_geliefert",
] as const

const lagerortOptions = [
  "regal_a1",
  "regal_a2",
  "regal_b1",
  "regal_b2",
  "hochregal_1",
  "kuehllager",
  "aussenlager",
  "retoure",
] as const

const qualitaetOptions = [
  "bestanden",
  "mit_maengeln",
  "nicht_bestanden",
  "nicht_geprueft",
] as const

const cardClassName =
  "border-border/70 shadow-sm transition-shadow transition-colors hover:shadow-md hover:border-accent/40"

const numberFormatter = new Intl.NumberFormat("de-DE")

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-"
  return numberFormatter.format(value)
}

function formatKeyLabel(value?: string | null) {
  if (!value) return "-"
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatDateLabel(value?: string | null, pattern = "dd.MM.yyyy") {
  if (!value) return "-"
  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return format(parsed, pattern, { locale: de })
}

function getDisplayDate(value?: string | null) {
  if (!value) return null
  return value.includes("T") ? value.split("T")[0] : value
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-11 w-52" />
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-12">
          <div className="md:col-span-8 flex flex-col gap-6">
            <Skeleton className="h-[260px] w-full" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-[280px] w-full" />
            <Skeleton className="h-[280px] w-full" />
          </div>
          <div className="md:col-span-4 flex flex-col gap-6">
            <Skeleton className="h-[360px] w-full" />
            <Skeleton className="h-[260px] w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  className,
  children,
}: {
  title: string
  value: string
  className?: string
  children?: ReactNode
}) {
  return (
    <Card className={cn(cardClassName, className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        {children}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [lieferanten, setLieferanten] = useState<Lieferanten[]>([])
  const [bestellungen, setBestellungen] = useState<Bestellungen[]>([])
  const [produkte, setProdukte] = useState<Produkte[]>([])
  const [lagerbestand, setLagerbestand] = useState<Lagerbestand[]>([])
  const [wareneingang, setWareneingang] = useState<Wareneingang[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionOpen, setActionOpen] = useState(false)
  const [formState, setFormState] = useState<WareneingangFormState>(
    initialFormState
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [
        lieferantenData,
        bestellungenData,
        produkteData,
        lagerbestandData,
        wareneingangData,
      ] = await Promise.all([
        LivingAppsService.getLieferanten(),
        LivingAppsService.getBestellungen(),
        LivingAppsService.getProdukte(),
        LivingAppsService.getLagerbestand(),
        LivingAppsService.getWareneingang(),
      ])
      setLieferanten(lieferantenData)
      setBestellungen(bestellungenData)
      setProdukte(produkteData)
      setLagerbestand(lagerbestandData)
      setWareneingang(wareneingangData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const lieferantenById = useMemo(() => {
    return new Map(lieferanten.map((item) => [item.record_id, item]))
  }, [lieferanten])

  const produkteById = useMemo(() => {
    return new Map(produkte.map((item) => [item.record_id, item]))
  }, [produkte])

  const stockByProductId = useMemo(() => {
    const map = new Map<string, { available: number; locations: Set<string> }>()
    lagerbestand.forEach((entry) => {
      const productId = extractRecordId(entry.fields.produkt)
      if (!productId) return
      const current = map.get(productId) ?? {
        available: 0,
        locations: new Set<string>(),
      }
      current.available += entry.fields.verfuegbar ?? 0
      if (entry.fields.lagerort) {
        current.locations.add(entry.fields.lagerort)
      }
      map.set(productId, current)
    })
    return map
  }, [lagerbestand])

  const totalAvailable = useMemo(() => {
    return lagerbestand.reduce(
      (sum, entry) => sum + (entry.fields.verfuegbar ?? 0),
      0
    )
  }, [lagerbestand])

  const activeProducts = useMemo(() => {
    return produkte.filter((item) => item.fields.aktiv === "aktiv").length
  }, [produkte])

  const supplierAverage = useMemo(() => {
    const values = lieferanten
      .map((item) => item.fields.lieferzeit)
      .filter((value): value is number => value != null)
    if (values.length === 0) return null
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }, [lieferanten])

  const openOrders = useMemo(() => {
    const openSet = new Set<string>(openStatusKeys)
    return bestellungen.filter((order) => {
      const status = order.fields.status
      return status ? openSet.has(status) : false
    })
  }, [bestellungen])

  const openOrdersSorted = useMemo(() => {
    return [...openOrders].sort((a, b) => {
      const dateA = getDisplayDate(a.fields.erwartetes_lieferdatum) ?? "9999-12-31"
      const dateB = getDisplayDate(b.fields.erwartetes_lieferdatum) ?? "9999-12-31"
      return dateA.localeCompare(dateB)
    })
  }, [openOrders])

  const openStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    openOrders.forEach((order) => {
      const status = order.fields.status
      if (!status) return
      counts[status] = (counts[status] ?? 0) + 1
    })
    return counts
  }, [openOrders])

  const stockSummary = useMemo(() => {
    const summaries = produkte.map((product) => {
      const stock = stockByProductId.get(product.record_id)
      const available = stock?.available ?? 0
      const minimum = product.fields.mindestbestand ?? 0
      const deficit = Math.max(0, minimum - available)
      const locations = stock?.locations ?? new Set<string>()
      let locationLabel = "-"
      if (locations.size > 1) {
        locationLabel = "Mehrere Lagerorte"
      } else if (locations.size === 1) {
        locationLabel = formatKeyLabel(Array.from(locations)[0])
      }
      return { product, available, minimum, deficit, locationLabel }
    })
    const critical = summaries.filter((item) => item.available < item.minimum)
    critical.sort((a, b) => b.deficit - a.deficit)
    return {
      totalProducts: summaries.length,
      criticalCount: critical.length,
      criticalItems: critical.slice(0, 8),
    }
  }, [produkte, stockByProductId])

  const healthyPercent =
    stockSummary.totalProducts > 0
      ? Math.round(
          ((stockSummary.totalProducts - stockSummary.criticalCount) /
            stockSummary.totalProducts) *
            100
        )
      : 0

  const markerPosition = Math.min(98, Math.max(2, 100 - healthyPercent))

  const chartData = useMemo(() => {
    const cutoff = subDays(new Date(), 30)
    const map = new Map<string, number>()
    wareneingang.forEach((entry) => {
      const rawDate =
        getDisplayDate(entry.fields.lieferdatum) ??
        getDisplayDate(entry.fields.erfassungsdatum)
      if (!rawDate) return
      const parsed = parseISO(rawDate)
      if (Number.isNaN(parsed.getTime())) return
      if (isBefore(parsed, cutoff)) return
      const qty = entry.fields.gelieferte_menge ?? 0
      map.set(rawDate, (map.get(rawDate) ?? 0) + qty)
    })
    return Array.from(map.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [wareneingang])

  const chartDataMobile = useMemo(() => {
    return chartData.slice(-14)
  }, [chartData])

  const recentReceipts = useMemo(() => {
    return [...wareneingang]
      .sort((a, b) => {
        const dateA =
          getDisplayDate(a.fields.erfassungsdatum) ??
          getDisplayDate(a.fields.lieferdatum) ??
          a.createdat
        const dateB =
          getDisplayDate(b.fields.erfassungsdatum) ??
          getDisplayDate(b.fields.lieferdatum) ??
          b.createdat
        return dateB.localeCompare(dateA)
      })
      .slice(0, 6)
  }, [wareneingang])

  const todayLabel = format(new Date(), "dd.MM.yyyy", { locale: de })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    try {
      const fields: Wareneingang["fields"] = {
        bestellung: formState.bestellungId
          ? createRecordUrl(APP_IDS.BESTELLUNGEN, formState.bestellungId)
          : undefined,
        produkt: formState.produktId
          ? createRecordUrl(APP_IDS.PRODUKTE, formState.produktId)
          : undefined,
        lieferant: formState.lieferantId
          ? createRecordUrl(APP_IDS.LIEFERANTEN, formState.lieferantId)
          : undefined,
        lieferdatum: formState.lieferdatum || undefined,
        gelieferte_menge: formState.gelieferteMenge
          ? Number(formState.gelieferteMenge)
          : undefined,
        lagerort: (formState.lagerort || undefined) as
          | Wareneingang["fields"]["lagerort"]
          | undefined,
        qualitaetspruefung: (formState.qualitaetspruefung || undefined) as
          | Wareneingang["fields"]["qualitaetspruefung"]
          | undefined,
        lieferscheinnummer: formState.lieferscheinnummer || undefined,
        erfasst_von: formState.erfasstVon || undefined,
        erfassungsdatum: formState.erfassungsdatum || undefined,
        abweichungen: formState.abweichungen || undefined,
        notizen: formState.notizen || undefined,
      }

      await LivingAppsService.createWareneingangEntry(fields)
      setFormState(initialFormState)
      setActionOpen(false)
      await loadData()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Speichern fehlgeschlagen")
    } finally {
      setSubmitting(false)
    }
  }

  const getSupplierLabel = (url?: string | null) => {
    const id = extractRecordId(url)
    if (!id) return "-"
    const supplier = lieferantenById.get(id)
    return (
      supplier?.fields.firmenname ?? supplier?.fields.lieferantennummer ?? "-"
    )
  }

  const getProductLabel = (url?: string | null) => {
    const id = extractRecordId(url)
    if (!id) return "-"
    const product = produkteById.get(id)
    return product?.fields.produktname ?? product?.fields.artikelnummer ?? "-"
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fehler beim Laden</AlertTitle>
            <AlertDescription className="space-y-3">
              <div>{error}</div>
              <Button
                variant="outline"
                className="active:translate-y-[1px]"
                onClick={loadData}
              >
                Erneut versuchen
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage:
          "radial-gradient(1200px circle at 0% 0%, hsl(32 78% 54% / 0.08), transparent 60%)",
      }}
    >
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-3xl font-semibold">Lager Cockpit</div>
              <div className="text-sm text-muted-foreground">
                Stand: {todayLabel}
              </div>
            </div>
            <DialogTrigger asChild>
              <Button className="h-11 px-6 active:translate-y-[1px]">
                Wareneingang erfassen
              </Button>
            </DialogTrigger>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-12">
            <div className="md:col-span-8 flex flex-col gap-6">
              <Card
                className={cn(
                  cardClassName,
                  "relative min-h-[52vh] overflow-hidden md:min-h-[260px]",
                  "animate-in fade-in-0 slide-in-from-bottom-2 duration-700"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Kritische Bestaende
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="text-5xl font-semibold md:text-6xl">
                        {stockSummary.criticalCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stockSummary.criticalCount} von {stockSummary.totalProducts}
                        {" "}
                        Produkten unter Mindestbestand
                      </div>
                    </div>
                  <div className="flex items-center gap-3">
                      <Badge className="bg-secondary text-secondary-foreground">
                        {healthyPercent}% gesund
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div
                      className="relative h-2 w-full rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, hsl(145 46% 36%), hsl(32 78% 54%) 60%, hsl(4 72% 50%))",
                      }}
                    />
                    <div className="relative h-3">
                      <div
                        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[hsl(32_78%_54%)] ring-2 ring-card shadow-sm"
                        style={{ left: `calc(${markerPosition}% - 6px)` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 overflow-x-auto pb-2 md:hidden">
                <StatCard
                  className="min-w-[160px] animate-in fade-in-0 slide-in-from-bottom-2 delay-100 duration-700"
                  title="Verfuegbar gesamt"
                  value={formatNumber(totalAvailable)}
                />
                <StatCard
                  className="min-w-[160px] animate-in fade-in-0 slide-in-from-bottom-2 delay-100 duration-700"
                  title="Offene Bestellungen"
                  value={formatNumber(openOrders.length)}
                >
                  <div className="flex items-center gap-1">
                    {openStatusKeys.map((status) => (
                      <span
                        key={status}
                        title={`${formatKeyLabel(status)}: ${
                          openStatusCounts[status] ?? 0
                        }`}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          status === "entwurf" && "bg-muted-foreground/60",
                          status === "bestellt" && "bg-accent",
                          status === "bestaetigt" && "bg-primary",
                          status === "teilweise_geliefert" &&
                            "bg-[hsl(145_46%_36%)]"
                        )}
                      />
                    ))}
                  </div>
                </StatCard>
                <StatCard
                  className="min-w-[160px] animate-in fade-in-0 slide-in-from-bottom-2 delay-100 duration-700"
                  title="Aktive Produkte"
                  value={formatNumber(activeProducts)}
                />
                <StatCard
                  className="min-w-[160px] animate-in fade-in-0 slide-in-from-bottom-2 delay-100 duration-700"
                  title="Lieferanten"
                  value={formatNumber(lieferanten.length)}
                >
                  <div className="text-xs text-muted-foreground">
                    Durchschn. Lieferzeit: {formatNumber(supplierAverage)} Tage
                  </div>
                </StatCard>
              </div>

              <div className="hidden md:grid md:grid-cols-2 md:gap-4 md:animate-in md:fade-in-0 md:slide-in-from-bottom-2 md:delay-100 md:duration-700">
                <StatCard title="Verfuegbar gesamt" value={formatNumber(totalAvailable)} />
                <StatCard title="Offene Bestellungen" value={formatNumber(openOrders.length)}>
                  <div className="flex items-center gap-1">
                    {openStatusKeys.map((status) => (
                      <span
                        key={status}
                        title={`${formatKeyLabel(status)}: ${
                          openStatusCounts[status] ?? 0
                        }`}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          status === "entwurf" && "bg-muted-foreground/60",
                          status === "bestellt" && "bg-accent",
                          status === "bestaetigt" && "bg-primary",
                          status === "teilweise_geliefert" &&
                            "bg-[hsl(145_46%_36%)]"
                        )}
                      />
                    ))}
                  </div>
                </StatCard>
                <StatCard title="Aktive Produkte" value={formatNumber(activeProducts)} />
                <StatCard title="Lieferanten" value={formatNumber(lieferanten.length)}>
                  <div className="text-xs text-muted-foreground">
                    Durchschn. Lieferzeit: {formatNumber(supplierAverage)} Tage
                  </div>
                </StatCard>
              </div>

              <Card
                className={cn(
                  cardClassName,
                  "animate-in fade-in-0 slide-in-from-bottom-2 delay-200 duration-700"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Wareneingang Trend (30 Tage)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>Noch keine Wareneingaenge</EmptyTitle>
                        <EmptyDescription>
                          Erfasse den ersten Wareneingang, um Trends zu sehen.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <>
                      <div className="h-[240px] md:hidden">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartDataMobile}>
                            <defs>
                              <linearGradient id="incomingMobile" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                  offset="0%"
                                  stopColor="hsl(173 42% 32%)"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="hsl(173 42% 32%)"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="date"
                              tickFormatter={(value) => formatDateLabel(value, "dd.MM")}
                              tick={{ fontSize: 11 }}
                              interval={2}
                              axisLine={false}
                              tickLine={false}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 12,
                              }}
                              labelFormatter={(value) =>
                                `Datum: ${formatDateLabel(String(value))}`
                              }
                              formatter={(value) => [formatNumber(Number(value)), "Menge"]}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="hsl(173 42% 32%)"
                              fill="url(#incomingMobile)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="hidden h-[280px] md:block">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="incomingDesktop" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                  offset="0%"
                                  stopColor="hsl(173 42% 32%)"
                                  stopOpacity={0.35}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="hsl(173 42% 32%)"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="date"
                              tickFormatter={(value) => formatDateLabel(value, "dd.MM")}
                              tick={{ fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 12,
                              }}
                              labelFormatter={(value) =>
                                `Datum: ${formatDateLabel(String(value))}`
                              }
                              formatter={(value) => [formatNumber(Number(value)), "Menge"]}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="hsl(173 42% 32%)"
                              fill="url(#incomingDesktop)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card
                className={cn(
                  cardClassName,
                  "animate-in fade-in-0 slide-in-from-bottom-2 delay-300 duration-700"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Kritische Bestaende
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stockSummary.criticalItems.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>Keine kritischen Bestaende</EmptyTitle>
                        <EmptyDescription>
                          Alle Produkte liegen aktuell ueber dem Mindestbestand.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="space-y-3">
                      <div className="hidden text-xs font-medium text-muted-foreground md:grid md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr] md:gap-3">
                        <div>Produkt</div>
                        <div>Lagerort</div>
                        <div>Verfuegbar</div>
                        <div>Mindestbestand</div>
                        <div>Defizit</div>
                      </div>
                      {stockSummary.criticalItems.map((item) => (
                        <div
                          key={item.product.record_id}
                          className="rounded-lg border border-border/60 p-3 transition-shadow hover:shadow-sm md:grid md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr] md:items-center md:gap-3"
                        >
                          <div className="space-y-1">
                            <div className="font-medium">
                              {item.product.fields.produktname ??
                                item.product.fields.artikelnummer ??
                                "Produkt"}
                            </div>
                            <div className="text-xs text-muted-foreground md:hidden">
                              Lagerort: {item.locationLabel}
                            </div>
                          </div>
                          <div className="hidden text-sm md:block">
                            {item.locationLabel}
                          </div>
                          <div className="text-sm">{formatNumber(item.available)}</div>
                          <div className="text-sm">{formatNumber(item.minimum)}</div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                            <span className="h-2 w-2 rounded-full bg-destructive" />
                            {formatNumber(item.deficit)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-4 flex flex-col gap-6">
              <Card
                className={cn(
                  cardClassName,
                  "animate-in fade-in-0 slide-in-from-bottom-2 delay-400 duration-700"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Aktuelle Bestellungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {openOrdersSorted.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>Keine offenen Bestellungen</EmptyTitle>
                        <EmptyDescription>
                          Es liegen aktuell keine offenen Bestellungen vor.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="space-y-3">
                      {openOrdersSorted.slice(0, 6).map((order) => {
                        const status = order.fields.status
                        return (
                          <div
                            key={order.record_id}
                            className="rounded-lg border border-border/60 p-3 text-sm transition-shadow hover:shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {order.fields.bestellnummer ??
                                    `Bestellung ${order.record_id.slice(-4)}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {getSupplierLabel(order.fields.lieferant)} ·{" "}
                                  {getProductLabel(order.fields.produkt)}
                                </div>
                              </div>
                              {status ? (
                                <Badge
                                  className={cn(
                                    "border-transparent",
                                    status === "entwurf" &&
                                      "bg-muted text-muted-foreground",
                                    status === "bestellt" &&
                                      "bg-accent text-accent-foreground",
                                    status === "bestaetigt" &&
                                      "bg-primary text-primary-foreground",
                                    status === "teilweise_geliefert" &&
                                      "bg-[hsl(145_46%_36%)] text-white"
                                  )}
                                >
                                  {formatKeyLabel(status)}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Erwartet: {formatDateLabel(order.fields.erwartetes_lieferdatum)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card
                className={cn(
                  cardClassName,
                  "animate-in fade-in-0 slide-in-from-bottom-2 delay-500 duration-700"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Letzte Wareneingaenge
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentReceipts.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>Noch keine Wareneingaenge</EmptyTitle>
                        <EmptyDescription>
                          Wareneingaenge erscheinen hier nach der Erfassung.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="space-y-3">
                      {recentReceipts.map((receipt) => {
                        const quality = receipt.fields.qualitaetspruefung
                        return (
                          <div
                            key={receipt.record_id}
                            className="rounded-lg border border-border/60 p-3 text-sm transition-shadow hover:shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {getProductLabel(receipt.fields.produkt)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {getSupplierLabel(receipt.fields.lieferant)}
                                </div>
                              </div>
                              {quality ? (
                                <Badge
                                  className={cn(
                                    "border-transparent",
                                    quality === "bestanden" &&
                                      "bg-[hsl(145_46%_36%)] text-white",
                                    quality === "mit_maengeln" &&
                                      "bg-accent text-accent-foreground",
                                    quality === "nicht_bestanden" &&
                                      "bg-destructive text-white",
                                    quality === "nicht_geprueft" &&
                                      "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {formatKeyLabel(quality)}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Menge: {formatNumber(receipt.fields.gelieferte_menge)} ·{" "}
                              {formatDateLabel(
                                receipt.fields.lieferdatum ?? receipt.fields.erfassungsdatum
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="fixed inset-x-4 bottom-4 z-40 md:hidden">
          <DialogTrigger asChild>
            <Button className="h-12 w-full active:translate-y-[1px]">
              Wareneingang erfassen
            </Button>
          </DialogTrigger>
        </div>

        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Wareneingang erfassen</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="bestellung">Bestellung</Label>
              <Select
                value={formState.bestellungId || "none"}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    bestellungId: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="bestellung">
                  <SelectValue placeholder="Bestellung auswaehlen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine</SelectItem>
                  {bestellungen.map((order) => (
                    <SelectItem key={order.record_id} value={order.record_id}>
                      {order.fields.bestellnummer ??
                        `Bestellung ${order.record_id.slice(-4)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="produkt">Produkt</Label>
              <Select
                value={formState.produktId || "none"}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    produktId: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="produkt">
                  <SelectValue placeholder="Produkt auswaehlen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keines</SelectItem>
                  {produkte.map((product) => (
                    <SelectItem key={product.record_id} value={product.record_id}>
                      {product.fields.produktname ??
                        product.fields.artikelnummer ??
                        "Produkt"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lieferant">Lieferant</Label>
              <Select
                value={formState.lieferantId || "none"}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    lieferantId: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="lieferant">
                  <SelectValue placeholder="Lieferant auswaehlen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keiner</SelectItem>
                  {lieferanten.map((supplier) => (
                    <SelectItem key={supplier.record_id} value={supplier.record_id}>
                      {supplier.fields.firmenname ??
                        supplier.fields.lieferantennummer ??
                        "Lieferant"}
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
                value={formState.lieferdatum}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    lieferdatum: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gelieferteMenge">Gelieferte Menge</Label>
              <Input
                id="gelieferteMenge"
                type="number"
                min="0"
                step="1"
                value={formState.gelieferteMenge}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    gelieferteMenge: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lagerort">Lagerort</Label>
              <Select
                value={formState.lagerort || "none"}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    lagerort: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="lagerort">
                  <SelectValue placeholder="Lagerort auswaehlen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keiner</SelectItem>
                  {lagerortOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatKeyLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualitaetspruefung">Qualitaetspruefung</Label>
              <Select
                value={formState.qualitaetspruefung || "none"}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    qualitaetspruefung: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="qualitaetspruefung">
                  <SelectValue placeholder="Status auswaehlen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine</SelectItem>
                  {qualitaetOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatKeyLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lieferscheinnummer">Lieferscheinnummer</Label>
              <Input
                id="lieferscheinnummer"
                value={formState.lieferscheinnummer}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    lieferscheinnummer: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="erfasstVon">Erfasst von</Label>
              <Input
                id="erfasstVon"
                value={formState.erfasstVon}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    erfasstVon: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="erfassungsdatum">Erfassungsdatum</Label>
              <Input
                id="erfassungsdatum"
                type="datetime-local"
                value={formState.erfassungsdatum}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    erfassungsdatum: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="abweichungen">Abweichungen</Label>
              <Textarea
                id="abweichungen"
                rows={3}
                value={formState.abweichungen}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    abweichungen: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notizen">Notizen</Label>
              <Textarea
                id="notizen"
                rows={3}
                value={formState.notizen}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    notizen: event.target.value,
                  }))
                }
              />
            </div>

            {submitError ? (
              <div className="md:col-span-2">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Speichern fehlgeschlagen</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              </div>
            ) : null}

            <div className="md:col-span-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="active:translate-y-[1px]"
                onClick={() => setActionOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="active:translate-y-[1px]"
              >
                {submitting ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
