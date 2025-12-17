// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS } from '@/types/app';
import type { Lieferanten, Bestellungen, Lagerverwaltungssystem, Produkte, Lagerbestand, Wareneingang } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: string | null | undefined): string | null {
  if (!url) return null;
  // Extrahiere die letzten 24 Hex-Zeichen mit Regex
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

export class LivingAppsService {
  // --- LIEFERANTEN ---
  static async getLieferanten(): Promise<Lieferanten[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.LIEFERANTEN}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getLieferantenEntry(id: string): Promise<Lieferanten | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.LIEFERANTEN}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createLieferantenEntry(fields: Lieferanten['fields']) {
    return callApi('POST', `/apps/${APP_IDS.LIEFERANTEN}/records`, { fields });
  }
  static async updateLieferantenEntry(id: string, fields: Partial<Lieferanten['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.LIEFERANTEN}/records/${id}`, { fields });
  }
  static async deleteLieferantenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.LIEFERANTEN}/records/${id}`);
  }

  // --- BESTELLUNGEN ---
  static async getBestellungen(): Promise<Bestellungen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.BESTELLUNGEN}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getBestellungenEntry(id: string): Promise<Bestellungen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.BESTELLUNGEN}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createBestellungenEntry(fields: Bestellungen['fields']) {
    return callApi('POST', `/apps/${APP_IDS.BESTELLUNGEN}/records`, { fields });
  }
  static async updateBestellungenEntry(id: string, fields: Partial<Bestellungen['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.BESTELLUNGEN}/records/${id}`, { fields });
  }
  static async deleteBestellungenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.BESTELLUNGEN}/records/${id}`);
  }

  // --- LAGERVERWALTUNGSSYSTEM ---
  static async getLagerverwaltungssystem(): Promise<Lagerverwaltungssystem[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.LAGERVERWALTUNGSSYSTEM}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getLagerverwaltungssystemEntry(id: string): Promise<Lagerverwaltungssystem | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.LAGERVERWALTUNGSSYSTEM}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createLagerverwaltungssystemEntry(fields: Lagerverwaltungssystem['fields']) {
    return callApi('POST', `/apps/${APP_IDS.LAGERVERWALTUNGSSYSTEM}/records`, { fields });
  }
  static async updateLagerverwaltungssystemEntry(id: string, fields: Partial<Lagerverwaltungssystem['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.LAGERVERWALTUNGSSYSTEM}/records/${id}`, { fields });
  }
  static async deleteLagerverwaltungssystemEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.LAGERVERWALTUNGSSYSTEM}/records/${id}`);
  }

  // --- PRODUKTE ---
  static async getProdukte(): Promise<Produkte[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.PRODUKTE}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getProdukteEntry(id: string): Promise<Produkte | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.PRODUKTE}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createProdukteEntry(fields: Produkte['fields']) {
    return callApi('POST', `/apps/${APP_IDS.PRODUKTE}/records`, { fields });
  }
  static async updateProdukteEntry(id: string, fields: Partial<Produkte['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.PRODUKTE}/records/${id}`, { fields });
  }
  static async deleteProdukteEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.PRODUKTE}/records/${id}`);
  }

  // --- LAGERBESTAND ---
  static async getLagerbestand(): Promise<Lagerbestand[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.LAGERBESTAND}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getLagerbestandEntry(id: string): Promise<Lagerbestand | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.LAGERBESTAND}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createLagerbestandEntry(fields: Lagerbestand['fields']) {
    return callApi('POST', `/apps/${APP_IDS.LAGERBESTAND}/records`, { fields });
  }
  static async updateLagerbestandEntry(id: string, fields: Partial<Lagerbestand['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.LAGERBESTAND}/records/${id}`, { fields });
  }
  static async deleteLagerbestandEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.LAGERBESTAND}/records/${id}`);
  }

  // --- WARENEINGANG ---
  static async getWareneingang(): Promise<Wareneingang[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.WARENEINGANG}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getWareneingangEntry(id: string): Promise<Wareneingang | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.WARENEINGANG}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createWareneingangEntry(fields: Wareneingang['fields']) {
    return callApi('POST', `/apps/${APP_IDS.WARENEINGANG}/records`, { fields });
  }
  static async updateWareneingangEntry(id: string, fields: Partial<Wareneingang['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.WARENEINGANG}/records/${id}`, { fields });
  }
  static async deleteWareneingangEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.WARENEINGANG}/records/${id}`);
  }

}