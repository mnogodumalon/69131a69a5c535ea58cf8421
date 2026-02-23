/**
 * AI feature toggles per entity.
 * Set to true to show "Foto scannen" button in the create/edit dialog.
 * The agent can change these values — all other AI files are pre-generated.
 */

export const AI_PHOTO_SCAN: Record<string, boolean> = {
  Lieferanten: false,
  Bestellungen: false,
  Produkte: false,
  Lagerbestand: false,
  Wareneingang: false,
};