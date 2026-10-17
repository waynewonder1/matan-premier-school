// Supabase Edge Function: enquiry-autoreply
//
// Triggered by a Supabase Database Webhook on INSERT into public.enquiries.
// Sends two emails through Resend:
//   1. an auto-reply to the parent who filled in the contact form
//   2. a notification to the school with the enquiry details
//
// Required secrets (Project > Edge Functions > Secrets):
//   RESEND_API_KEY  - API key from resend.com
//   WEBHOOK_SECRET  - any long random string; the webhook must send it
//                     in the "x-webhook-secret" header
// Optional:
//   FROM_EMAIL      - defaults to "Matan Premier Schools <hello@matanpremierschools.co.ke>"
//   SCHOOL_EMAIL    - defaults to "matanpremierschools@gmail.com"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ??
  'Matan Premier Schools <hello@matanpremierschools.co.ke>';
const SCHOOL_EMAIL = Deno.env.get('SCHOOL_EMAIL') ?? 'matanpremierschools@gmail.com';

const SITE_URL = 'https://matanpremierschools.co.ke';
const PHONES = '0712 000 805 / 0721 605 578';

type Enquiry = {
  id?: number | string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendEmail(payload: Record<string, unknown>) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function parentEmail(enquiry: Enquiry) {
  const firstName = escapeHtml(enquiry.name.split(' ')[0] || enquiry.name);

  return {
    from: FROM_EMAIL,
    to: [enquiry.email],
    reply_to: SCHOOL_EMAIL,
    subject: 'Thank you for contacting Matan Premier Schools',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 560px;">
        <h2 style="color: #7a1f1f;">Thank you, ${firstName}!</h2>
        <p>We have received your message and a member of our team will get back to you
        within one working day.</p>
        <p>For anything urgent, please call us on <strong>${PHONES}</strong>.</p>
        <p style="margin-top: 24px;">Here is a copy of your message:</p>
        <blockquote style="border-left: 3px solid #ccc; margin: 0; padding-left: 12px; color: #555;">
          ${escapeHtml(enquiry.message).replace(/\n/g, '<br>')}
        </blockquote>
        <p style="margin-top: 24px;">Warm regards,<br>Matan Premier Schools<br>
        <a href="${SITE_URL}">${SITE_URL.replace('https://', '')}</a></p>
      </div>
    `,
  };
}

function schoolEmail(enquiry: Enquiry) {
  const name = escapeHtml(enquiry.name);
  const email = escapeHtml(enquiry.email);
  const phone = enquiry.phone ? escapeHtml(enquiry.phone) : 'Not provided';

  return {
    from: FROM_EMAIL,
    to: [SCHOOL_EMAIL],
    // Hitting "Reply" in the inbox goes straight to the parent.
    reply_to: enquiry.email,
    subject: `New enquiry from ${enquiry.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 560px;">
        <h2 style="color: #7a1f1f;">New website enquiry</h2>
        <p><strong>Name:</strong> ${name}<br>
        <strong>Email:</strong> <a href="mailto:${email}">${email}</a><br>
        <strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left: 3px solid #ccc; margin: 0; padding-left: 12px; color: #555;">
          ${escapeHtml(enquiry.message).replace(/\n/g, '<br>')}
        </blockquote>
        <p style="margin-top: 24px; font-size: 13px; color: #777;">
          Reply to this email to answer the parent directly, or manage all enquiries in the
          <a href="${SITE_URL}/admin.html">admin dashboard</a>.
        </p>
      </div>
    `,
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!WEBHOOK_SECRET || req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { type?: string; table?: string; record?: Enquiry };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const enquiry = body.record;
  if (body.type !== 'INSERT' || body.table !== 'enquiries' || !enquiry?.email) {
    return new Response('Ignored', { status: 200 });
  }

  const results = await Promise.allSettled([
    sendEmail(parentEmail(enquiry)),
    sendEmail(schoolEmail(enquiry)),
  ]);

  const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => String(r.reason));

  if (failures.length > 0) {
    console.error('Auto-reply errors:', failures);
    return new Response(JSON.stringify({ ok: false, errors: failures }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
