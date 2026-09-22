import nodemailer from "nodemailer";
import { getBaseUrl } from "@/lib/utils";
import { BRAND } from "@/lib/constants";

/**
 * Transactional email. When SMTP is not configured (local dev, or hosts where
 * email is handled elsewhere), mail is logged to the server console instead of
 * being sent — nothing in Sevika depends on email delivery.
 */

let transporter: nodemailer.Transporter | null | undefined;

function getTransport() {
  if (transporter !== undefined) return transporter;
  if (!process.env.SMTP_HOST) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return transporter;
}

export function emailShell(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#faf5f6;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <p style="font-size:22px;font-weight:700;color:#e11d48;margin:0 0 24px;">${BRAND.name}</p>
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #fce7ea;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#27272a;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="color:#a1a1aa;font-size:12px;margin-top:24px;">
      ${BRAND.name} — ${BRAND.tagline}. 0% commission, always.
      <br/>Questions? Write to ${BRAND.supportEmail}
    </p>
  </div></body></html>`;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  const transport = getTransport();
  const from = process.env.EMAIL_FROM || `${BRAND.name} <no-reply@sevika.app>`;
  if (!transport) {
    console.log(`[email:dev] to=${opts.to} subject="${opts.subject}"`);
    return;
  }
  try {
    await transport.sendMail({ from, ...opts });
  } catch (err) {
    console.error("[email] send failed", err);
  }
}

export function appLink(path: string) {
  return `${getBaseUrl()}${path}`;
}
