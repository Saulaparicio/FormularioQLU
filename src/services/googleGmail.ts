import type { RegistrationData } from '../types';
import { clearCachedAccessToken } from './firebaseAuth';

/**
 * Base64URL-safe encoding with full UTF-8 character support
 */
function encodeBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends an email using Gmail API
 */
async function sendRawEmail(accessToken: string, rawMessage: string): Promise<boolean> {
  if (!accessToken || !accessToken.trim()) {
    throw new Error('AUTH_EXPIRED: No hay una sesión de Google activa para enviar correos.');
  }

  const encodedMessage = encodeBase64Url(rawMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedMessage
    })
  });

  if (res.status === 401) {
    clearCachedAccessToken();
    throw new Error('AUTH_EXPIRED: Las credenciales de Google expiraron para enviar correos. Conecta tu cuenta nuevamente.');
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Error enviando correo con Gmail API:', errorText);
    throw new Error(`Gmail API error: ${errorText}`);
  }

  return true;
}

/**
 * Sends a confirmation receipt to the registered attendee
 */
export async function sendUserReceipt(
  accessToken: string,
  registration: RegistrationData,
  senderEmail: string
): Promise<boolean> {
  const fullName = (registration.nombreCompleto || `${registration.nombre || ''} ${registration.apellido || ''}`.trim()).trim();
  const subject = `Comprobante de Registro - Feria QLU 🎓`;
  const programsListHtml = registration.programas
    .map(
      (prog) =>
        `<li style="margin-bottom: 6px; padding: 6px 12px; background-color: #f1f5f9; border-radius: 6px; color: #0f172a; font-weight: 500;">${prog}</li>`
    )
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Comprobante de Registro Feria QLU</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <tr>
      <td style="background-color: #0f2042; padding: 32px 28px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Quality Leadership University</h1>
        <p style="color: #93c5fd; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">Feria de Oportunidades Académicas QLU</p>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 32px 28px;">
        <h2 style="margin: 0 0 16px 0; color: #0f2042; font-size: 20px;">¡Hola, ${fullName}!</h2>
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
          Hemos recibido tu registro con éxito para la <strong>Feria QLU</strong>. Te esperamos para brindarte asesoría personalizada y acompañarte en la consecución de tus metas académicas y profesionales.
        </p>
        
        <!-- Summary Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Datos de tu Registro:</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Aspirante:</strong> ${fullName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Correo:</strong> ${registration.correo}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Teléfono / Celular:</strong> ${registration.celular}</p>
          
          <p style="margin: 16px 0 8px 0; font-size: 14px; font-weight: 600; color: #0f2042;">Programa(s) de tu interés:</p>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${programsListHtml}
          </ul>
        </div>

        <p style="font-size: 14px; line-height: 1.5; color: #475569;">
          Un asesor de admisiones de QLU se pondrá en contacto contigo muy pronto para brindarte toda la información de fechas, requisitos, convenios internacionales y facilidades de financiamiento.
        </p>

        <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #94a3b8;">
          <p style="margin: 0;">Quality Leadership University • Calle 45 Bella Vista, Ciudad de Panamá</p>
          <p style="margin: 4px 0 0 0;">Tel: +(507) 264-0777 • admisiones@qlu.ac.pa</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const rawMessage = [
    `To: ${registration.correo}`,
    `From: ${senderEmail}`,
    `Subject: =?UTF-8?B?${encodeBase64Url(subject)}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    htmlBody
  ].join('\r\n');

  return sendRawEmail(accessToken, rawMessage);
}

/**
 * Sends notification email to the system administrator to manage new admission lead
 */
export async function sendAdminNotification(
  accessToken: string,
  registration: RegistrationData,
  adminEmail: string,
  spreadsheetUrl?: string
): Promise<boolean> {
  const fullName = (registration.nombreCompleto || `${registration.nombre || ''} ${registration.apellido || ''}`.trim()).trim();
  const subject = `Nuevo Ingreso: ${fullName} - Feria QLU`;
  const cleanPhone = registration.celular.replace(/\D/g, '');
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : '';

  const programsTags = registration.programas
    .map(
      (prog) =>
        `<span style="display: inline-block; margin: 4px 4px 4px 0; padding: 4px 10px; background-color: #dbeafe; color: #1e40af; border-radius: 9999px; font-size: 12px; font-weight: 600;">${prog}</span>`
    )
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nuevo Ingreso Registrado - Feria QLU</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1;">
    <tr>
      <td style="background-color: #1e3a8a; padding: 24px; color: #ffffff;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #93c5fd; font-weight: 700;">Panel de Gestión de Admisiones</span>
        <h2 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 700;">Nuevo Prospecto Registrado en Feria QLU</h2>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td width="30%" style="color: #64748b; font-weight: 500;">Nombre Completo:</td>
            <td style="font-weight: 700; color: #0f172a;">${fullName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="color: #64748b; font-weight: 500;">Correo:</td>
            <td><a href="mailto:${registration.correo}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${registration.correo}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="color: #64748b; font-weight: 500;">Teléfono / Celular:</td>
            <td style="font-weight: 600; color: #0f172a;">${registration.celular}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 500; vertical-align: top;">Interés Académico:</td>
            <td>${programsTags}</td>
          </tr>
        </table>

        <!-- Action buttons -->
        <div style="margin: 24px 0 16px 0; text-align: center;">
          ${
            whatsappUrl
              ? `<a href="${whatsappUrl}" target="_blank" style="display: inline-block; padding: 10px 18px; margin: 4px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px;">Contactar por WhatsApp</a>`
              : ''
          }
          <a href="mailto:${registration.correo}" style="display: inline-block; padding: 10px 18px; margin: 4px; background-color: #0f2042; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px;">Enviar Correo Directo</a>
          ${
            spreadsheetUrl
              ? `<a href="${spreadsheetUrl}" target="_blank" style="display: inline-block; padding: 10px 18px; margin: 4px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px;">Abrir Hoja Google Sheets</a>`
              : ''
          }
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">
          Registro ingresado en tiempo real desde la aplicación Feria QLU.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const rawMessage = [
    `To: ${adminEmail}`,
    `Subject: =?UTF-8?B?${encodeBase64Url(subject)}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    htmlBody
  ].join('\r\n');

  return sendRawEmail(accessToken, rawMessage);
}
