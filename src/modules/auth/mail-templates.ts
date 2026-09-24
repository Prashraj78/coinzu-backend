import { Env } from '../../common/config/env';

interface ActionEmailOptions {
  heading: string;
  lines: string[];
  buttonLabel: string;
  buttonUrl: string;
  footnote: string;
  // Marketing/digest sends only. Transactional mail is CAN-SPAM exempt and
  // omits it; the postal address below is unconditional.
  unsubscribeUrl?: string;
}

// Sending entity on every email: a missing postal address is a CAN-SPAM
// violation on marketing mail and a spam-filter penalty on all of it.
const COMPANY_NAME = 'Leadtym Technology Private Limited';
const COMPANY_ADDRESS =
  'A321, Master Mind 4, Royal Palms, Goregaon (E), Mumbai, Maharashtra 400065, India';
const SUPPORT_EMAIL = 'rahul@rewardtym.online';

const LOGO_KEY = 'branding/coinzu-logo.png';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Branded, table-based HTML for a single call-to-action email. Inline styles and a hosted logo, for email-client compatibility. */
export function buildActionEmailHtml(opts: ActionEmailOptions): string {
  const logoUrl = `${Env.r2.publicUrl.replace(/\/$/, '')}/${LOGO_KEY}`;
  const unsubscribeHtml = opts.unsubscribeUrl
    ? ` · <a href="${opts.unsubscribeUrl}" style="color:#5b2a86">Unsubscribe</a>`
    : '';
  const paragraphs = opts.lines
    .map((line) => `<p style="margin:0 0 16px;color:#3b2a5c;font-size:15px;line-height:1.6">${escapeHtml(line)}</p>`)
    .join('');

  return `<div style="background:#f4f0fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7defc">
    <tr><td style="background:linear-gradient(135deg,#5b2a86,#2e1150);padding:24px 32px;text-align:center">
      <img src="${logoUrl}" alt="Coinzu" height="28" style="height:28px;display:inline-block;border:0" />
    </td></tr>
    <tr><td style="padding:32px">
      <h1 style="margin:0 0 16px;color:#2e1150;font-size:20px">${escapeHtml(opts.heading)}</h1>
      ${paragraphs}
      <div style="text-align:center;margin:28px 0 12px">
        <a href="${opts.buttonUrl}" style="display:inline-block;background:#ffc93c;color:#2e1150;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:999px">${escapeHtml(opts.buttonLabel)}</a>
      </div>
      <p style="margin:24px 0 0;color:#8a7fae;font-size:12px;line-height:1.6">${escapeHtml(opts.footnote)}</p>
    </td></tr>
    <tr><td style="padding:20px 32px 28px;border-top:1px solid #efe9fb">
      <p style="margin:0 0 6px;color:#8a7fae;font-size:11px;line-height:1.6">
        Coinzu is operated by ${escapeHtml(COMPANY_NAME)}.
      </p>
      <p style="margin:0 0 6px;color:#8a7fae;font-size:11px;line-height:1.6">
        ${escapeHtml(COMPANY_ADDRESS)}
      </p>
      <p style="margin:0;color:#8a7fae;font-size:11px;line-height:1.6">
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#5b2a86">${SUPPORT_EMAIL}</a>${unsubscribeHtml}
      </p>
    </td></tr>
  </table>
</div>`;
}
