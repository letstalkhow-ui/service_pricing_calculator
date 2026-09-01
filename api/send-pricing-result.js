const BREVO_API = 'https://api.brevo.com/v3';
const DEFAULT_SENDER = 'info@letstalkhow.com';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function cleanText(value, max = 160) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function money(currency, value) {
  const n = cleanNumber(value);
  if (n === null) return 'Not available';
  return `${currency} ${Math.round(n).toLocaleString('en-US')}`;
}

async function brevo(path, body, apiKey) {
  const response = await fetch(`${BREVO_API}${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(data.message || `Brevo request failed (${response.status})`);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  const senderEmail = process.env.BREVO_SENDER_EMAIL || DEFAULT_SENDER;
  if (!apiKey || !Number.isInteger(listId) || listId <= 0) {
    return json(res, 500, { ok: false, error: 'Email service is not configured.' });
  }

  const body = req.body || {};
  if (cleanText(body.website)) return json(res, 200, { ok: true });

  const firstName = cleanText(body.firstName, 80);
  const email = cleanText(body.email, 180).toLowerCase();
  const company = cleanText(body.company, 120);
  const businessType = cleanText(body.businessType, 80);
  const serviceName = cleanText(body.serviceName, 120) || 'Your service';
  const pricingMode = body.pricingMode === 'hourly' ? 'Hourly' : 'Fixed Price';
  const currency = cleanText(body.currency, 8) || 'MUR';
  const currentPrice = cleanNumber(body.currentPrice);
  const suggestedPrice = cleanNumber(body.suggestedPrice);
  const breakEvenPrice = cleanNumber(body.breakEvenPrice);
  const priceGap = cleanNumber(body.priceGap);
  const pricingStatus = cleanText(body.pricingStatus, 80);
  const resultConsent = body.resultConsent === true;
  const marketingConsent = body.marketingConsent === true;

  if (!firstName || !isEmail(email)) {
    return json(res, 400, { ok: false, error: 'Please enter your first name and a valid email address.' });
  }
  if (!resultConsent) {
    return json(res, 400, { ok: false, error: 'Please confirm that we may process your details to email your result.' });
  }
  if (suggestedPrice === null || breakEvenPrice === null) {
    return json(res, 400, { ok: false, error: 'Please complete the calculator before emailing your result.' });
  }

  const attributes = {
    FIRSTNAME: firstName,
    LEAD_SOURCE: 'Service Pricing Calculator',
    TOOL_USED: 'Service Pricing Calculator',
    SERVICE_NAME: serviceName,
    PRICING_MODE: pricingMode,
    CURRENCY: currency,
    SUGGESTED_PRICE: suggestedPrice,
    BREAK_EVEN_PRICE: breakEvenPrice,
    CALCULATOR_DATE: new Date().toISOString().slice(0, 10)
  };
  if (company) attributes.COMPANY = company;
  if (businessType) attributes.BUSINESS_TYPE = businessType;
  if (currentPrice !== null && currentPrice > 0) attributes.CURRENT_PRICE = currentPrice;
  if (priceGap !== null) attributes.PRICE_GAP = priceGap;
  if (pricingStatus) attributes.PRICING_STATUS = pricingStatus;

  try {
    await brevo('/contacts', {
      email,
      attributes,
      ...(marketingConsent ? { listIds: [listId] } : {}),
      updateEnabled: true
    }, apiKey);

    const currentRow = currentPrice !== null && currentPrice > 0
      ? `<tr><td style="padding:9px 0;color:#666">Current price</td><td style="padding:9px 0;text-align:right;font-weight:700">${escapeHtml(money(currency, currentPrice))}</td></tr>`
      : '';
    const statusRow = pricingStatus
      ? `<tr><td style="padding:9px 0;color:#666">Pricing position</td><td style="padding:9px 0;text-align:right;font-weight:700">${escapeHtml(pricingStatus)}</td></tr>`
      : '';

    const htmlContent = `<!doctype html><html><body style="margin:0;background:#faf8f2;font-family:Arial,Helvetica,sans-serif;color:#111"><div style="max-width:620px;margin:0 auto;padding:28px 18px"><div style="background:#fcc70c;padding:20px 22px;border-radius:14px 14px 0 0"><div style="font-weight:900;font-size:22px">BusinessBoosts</div><div style="font-size:13px;margin-top:4px">Service Pricing Calculator</div></div><div style="background:#fff;padding:26px 22px;border:1px solid #e7e2d7;border-top:0;border-radius:0 0 14px 14px"><p style="margin-top:0">Hi ${escapeHtml(firstName)},</p><p style="line-height:1.6;color:#555">Here is the pricing summary you requested for <strong>${escapeHtml(serviceName)}</strong>.</p><div style="background:#111;color:#fff;border-radius:12px;padding:20px;margin:22px 0"><div style="font-size:11px;letter-spacing:1px;color:#bbb;font-weight:700">${pricingMode === 'Hourly' ? 'SUGGESTED HOURLY RATE' : 'SUGGESTED PRICE'}</div><div style="font-size:34px;font-weight:900;color:#ffd500;margin-top:6px">${escapeHtml(money(currency, suggestedPrice))}${pricingMode === 'Hourly' ? ' / hour' : ''}</div></div><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:9px 0;color:#666">Price that covers all costs</td><td style="padding:9px 0;text-align:right;font-weight:700">${escapeHtml(money(currency, breakEvenPrice))}${pricingMode === 'Hourly' ? ' / hour' : ''}</td></tr>${currentRow}${statusRow}</table><p style="line-height:1.6;color:#555;margin-top:24px">Use these figures as a decision guide, then test your price against your market, positioning and delivery capacity.</p><p style="line-height:1.6;color:#555">You can return to the calculator at any time to test a different price, cost structure or profit goal.</p><p style="margin-bottom:0"><strong>BusinessBoosts</strong><br><span style="color:#777;font-size:13px">Practical systems for clearer business decisions.</span></p></div><p style="font-size:11px;line-height:1.5;color:#888;padding:10px 4px">This calculator provides estimates for general business decision support and does not constitute accounting, tax, legal or financial advice.</p></div></body></html>`;

    const brandedHtmlContent = htmlContent.replace(
      '<div style="font-weight:900;font-size:22px">BusinessBoosts</div>',
      '<img src="https://www.businessboosts.io/assets/businessboosts-email-logo.png?v=2" width="207" height="72" alt="BusinessBoosts" style="display:block;width:207px;max-width:100%;height:auto">'
    ).replace(
      'This calculator provides estimates for general business decision support',
      'You received this transactional email because you requested your pricing result. Marketing preferences apply separately. This calculator provides estimates for general business decision support'
    );

    await brevo('/smtp/email', {
      sender: { name: 'BusinessBoosts', email: senderEmail },
      replyTo: { name: 'BusinessBoosts', email: senderEmail },
      to: [{ email, name: firstName }],
      subject: `Your BusinessBoosts pricing result for ${serviceName}`,
      htmlContent: brandedHtmlContent,
      tags: ['service-pricing-calculator']
    }, apiKey);

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('Brevo integration error', {
      status: error.status,
      message: error.message,
      details: error.details
    });
    return json(res, 502, { ok: false, error: 'We could not email your result right now. Please try again shortly.' });
  }
};
