import type { RegistrationData } from '../types';
import { clearCachedAccessToken } from './firebaseAuth';

const SHEET_TITLE = 'Feria QLU';
const DEFAULT_TAB_NAME = 'Registros';

interface EnsureSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  tabName: string;
}

const HEADERS = [
  'Marca Temporal',
  'Nombre',
  'Apellido',
  'Programas de Interés',
  'Correo Electrónico',
  'Celular',
  'Notificación Aspirante',
  'Notificación Admin'
];

/**
 * Extracts spreadsheet ID from a full Google Sheets URL or raw ID.
 */
export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Ensures header row exists on the given sheet tab.
 */
async function ensureHeaders(accessToken: string, spreadsheetId: string, tabName: string) {
  try {
    const range = `${encodeURIComponent(tabName)}!A1:G1`;
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    let needsHeaders = true;
    if (checkRes.ok) {
      const data = await checkRes.json();
      if (data.values && data.values.length > 0 && data.values[0].length > 0) {
        needsHeaders = false;
      }
    }

    if (needsHeaders) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [HEADERS]
          })
        }
      );
    }
  } catch (err) {
    console.warn('Notice while verifying headers:', err);
  }
}

/**
 * Searches for an existing "Feria QLU" spreadsheet or creates a new one.
 */
export async function getOrCreateFeriaQLUSheet(accessToken: string): Promise<EnsureSheetResult> {
  if (!accessToken || !accessToken.trim()) {
    throw new Error('AUTH_EXPIRED: No hay una sesión de Google activa. Por favor conecta tu cuenta de Google.');
  }

  // Check if we already have a cached or manually configured spreadsheet ID
  const cachedId = typeof window !== 'undefined' ? localStorage.getItem('feria_qlu_sheet_id') : null;
  if (cachedId) {
    try {
      const verifyRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cachedId}?fields=spreadsheetId,spreadsheetUrl,sheets.properties(sheetId,title)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (verifyRes.status === 401) {
        clearCachedAccessToken();
        throw new Error('AUTH_EXPIRED: Las credenciales de Google expiraron. Por favor vuelve a conectar tu cuenta.');
      }
      if (verifyRes.ok) {
        const data = await verifyRes.json();
        const tabList = (data.sheets || []).map((s: { properties: { title: string } }) => s.properties?.title);
        const resolvedTab = tabList.includes(DEFAULT_TAB_NAME) ? DEFAULT_TAB_NAME : (tabList[0] || DEFAULT_TAB_NAME);

        await ensureHeaders(accessToken, data.spreadsheetId, resolvedTab);

        return {
          spreadsheetId: data.spreadsheetId,
          spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
          tabName: resolvedTab
        };
      }
    } catch (vErr: unknown) {
      const err = vErr as { message?: string };
      if (err?.message?.includes('AUTH_EXPIRED')) throw vErr;
      // Continue to search Drive if verify fails
    }
  }

  // 1. Search Google Drive for an existing spreadsheet named "Feria QLU"
  try {
    const query = encodeURIComponent(`name = '${SHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (searchRes.status === 401) {
      clearCachedAccessToken();
      throw new Error('AUTH_EXPIRED: Las credenciales de Google expiraron. Por favor vuelve a conectar tu cuenta.');
    }

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const file = searchData.files[0];
        if (typeof window !== 'undefined') {
          localStorage.setItem('feria_qlu_sheet_id', file.id);
        }

        // Verify sheet tabs
        let tabName = DEFAULT_TAB_NAME;
        try {
          const metaRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=sheets.properties(sheetId,title)`,
            {
              headers: { Authorization: `Bearer ${accessToken}` }
            }
          );
          if (metaRes.ok) {
            const meta = await metaRes.json();
            const tabList = (meta.sheets || []).map((s: { properties: { title: string } }) => s.properties?.title);
            tabName = tabList.includes(DEFAULT_TAB_NAME) ? DEFAULT_TAB_NAME : (tabList[0] || DEFAULT_TAB_NAME);
          }
        } catch {
          // ignore
        }

        await ensureHeaders(accessToken, file.id, tabName);

        return {
          spreadsheetId: file.id,
          spreadsheetUrl: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
          tabName
        };
      }
    }
  } catch (driveErr) {
    console.warn('Drive search notice:', driveErr);
  }

  // 2. Create the spreadsheet if not found
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: SHEET_TITLE
      },
      sheets: [
        {
          properties: {
            title: DEFAULT_TAB_NAME,
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (createRes.status === 401) {
    clearCachedAccessToken();
    throw new Error('AUTH_EXPIRED: Las credenciales de Google expiraron. Por favor vuelve a conectar tu cuenta.');
  }

  if (!createRes.ok) {
    const errText = await createRes.text();
    let detail = errText;
    try {
      const json = JSON.parse(errText);
      detail = json.error?.message || errText;
    } catch {
      // ignore
    }
    throw new Error(`No se pudo crear la hoja en Google Sheets: ${detail}`);
  }

  const newSheetData = await createRes.json();
  const spreadsheetId = newSheetData.spreadsheetId;
  const spreadsheetUrl = newSheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  if (typeof window !== 'undefined') {
    localStorage.setItem('feria_qlu_sheet_id', spreadsheetId);
  }

  await ensureHeaders(accessToken, spreadsheetId, DEFAULT_TAB_NAME);

  return { spreadsheetId, spreadsheetUrl, tabName: DEFAULT_TAB_NAME };
}

/**
 * Appends a new attendee registration row to the "Feria QLU" spreadsheet.
 */
export async function appendRegistrationToSheet(
  accessToken: string,
  registration: RegistrationData,
  userNotified: boolean,
  adminNotified: boolean
): Promise<{ success: boolean; spreadsheetUrl: string }> {
  if (!accessToken || !accessToken.trim()) {
    throw new Error('AUTH_EXPIRED: No hay una sesión de Google activa. Por favor conecta tu cuenta de Google.');
  }

  const { spreadsheetId, spreadsheetUrl, tabName } = await getOrCreateFeriaQLUSheet(accessToken);

  const timestamp = new Date().toLocaleString('es-PA', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Check existing header format to support both new 7-col and legacy 8-col sheets
  let isLegacy8Columns = false;
  try {
    const headerCheckRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1:D1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (headerCheckRes.ok) {
      const hData = await headerCheckRes.json();
      if (hData.values && hData.values[0] && String(hData.values[0][2] || '').toLowerCase().includes('apellido')) {
        isLegacy8Columns = true;
      }
    }
  } catch {
    // default to new format
  }

  const fullName = (registration.nombreCompleto || `${registration.nombre || ''} ${registration.apellido || ''}`.trim()).trim();
  const nameParts = fullName.split(/\s+/);
  const firstName = registration.nombre?.trim() || nameParts[0] || '';
  const lastName = registration.apellido?.trim() || nameParts.slice(1).join(' ') || '';

  const row = isLegacy8Columns
    ? [
        timestamp,
        firstName,
        lastName,
        registration.programas.join(', '),
        registration.correo.trim().toLowerCase(),
        registration.celular.trim(),
        userNotified ? 'Comprobación enviada' : 'No enviada',
        adminNotified ? 'Admin notificado' : 'Pendiente'
      ]
    : [
        timestamp,
        fullName,
        registration.programas.join(', '),
        registration.correo.trim().toLowerCase(),
        registration.celular.trim(),
        userNotified ? 'Comprobación enviada' : 'No enviada',
        adminNotified ? 'Admin notificado' : 'Pendiente'
      ];

  const colEnd = isLegacy8Columns ? 'H' : 'G';
  const appendRange = `${encodeURIComponent(tabName)}!A:${colEnd}:append?valueInputOption=USER_ENTERED`;
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [row]
      })
    }
  );

  if (appendRes.status === 401) {
    clearCachedAccessToken();
    throw new Error('AUTH_EXPIRED: Las credenciales de Google expiraron. Por favor vuelve a conectar tu cuenta.');
  }

  if (!appendRes.ok) {
    const errorDetail = await appendRes.text();
    let detail = errorDetail;
    try {
      const json = JSON.parse(errorDetail);
      detail = json.error?.message || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(`Fallo al guardar en Google Sheets: ${detail}`);
  }

  return { success: true, spreadsheetUrl };
}

/**
 * Appends registration data directly to Google Sheets via Google Apps Script Webhook.
 * Requires ZERO Google logins, ZERO OAuth tokens, and has ZERO expiration issues.
 */
export async function appendRegistrationViaWebhook(
  webhookUrl: string,
  registration: RegistrationData
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, error: 'No se ha configurado la URL de Google Sheets' };
  }

  const timestamp = new Date().toLocaleString('es-PA', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const full = (registration.nombreCompleto || `${registration.nombre || ''} ${registration.apellido || ''}`).trim();
  const parts = full.split(/\s+/);
  const firstName = registration.nombre?.trim() || parts[0] || '';
  const lastName = registration.apellido?.trim() || parts.slice(1).join(' ') || '';
  const programsStr = Array.isArray(registration.programas) ? registration.programas.join(', ') : (registration.programas || '');

  const payload = {
    marcaTemporal: timestamp,
    fecha: timestamp,
    nombre: firstName,
    apellido: lastName,
    nombreCompleto: full,
    programas: registration.programas,
    programasTexto: programsStr,
    correo: registration.correo ? registration.correo.trim() : '',
    celular: registration.celular ? registration.celular.trim() : '',
    notificacionAspirante: 'Enviada',
    notificacionAdmin: 'Enviada',
    valores: [
      timestamp,
      firstName,
      lastName,
      programsStr,
      registration.correo ? registration.correo.trim() : '',
      registration.celular ? registration.celular.trim() : '',
      'Enviada',
      'Enviada'
    ]
  };

  try {
    // Send as text/plain to avoid CORS OPTIONS preflight issues with Google Apps Script
    await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (err: unknown) {
    try {
      // Fallback with no-cors mode for cross-domain redirects
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
      return { success: true };
    } catch (fallbackErr: unknown) {
      const msg = (fallbackErr as { message?: string })?.message || (err as { message?: string })?.message || 'Error al conectar con Google Sheets';
      return { success: false, error: msg };
    }
  }
}
