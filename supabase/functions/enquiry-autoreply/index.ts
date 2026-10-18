// Supabase Edge Function: enquiry-autoreply
//
// Triggered by a Supabase Database Webhook on INSERT into public.enquiries.
// Handles two kinds of rows (the `type` column):
//   - 'enquiry'   - contact form; the parent's reply depends on `topic`
//   - 'admission' - application form; both emails include the full form
// For each row it sends, through Resend:
//   1. an auto-reply to the parent
//   2. a notification to the school
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
const ADDRESS = 'Kiamumbi, Quito Street · QS 54, off Kamiti Road';

type Enquiry = {
  id?: number | string;
  type?: string;
  topic?: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  details?: Record<string, unknown> | null;
  created_at?: string;
};

const TOPIC_LABELS: Record<string, string> = {
  visit: 'School visit',
  fees: 'Fees & transport',
  admissions: 'Admissions',
  other: 'General enquiry',
};

// Extra paragraph in the parent's reply, chosen by the contact-form topic.
const TOPIC_REPLIES: Record<string, string> = {
  visit: `
    <p>We would love to show you around! Visits are welcome <strong>Monday to Friday
    between 8:00 AM and 3:00 PM</strong>. We will contact you shortly to agree on a time
    that suits you.</p>
    <p>You will find us at <strong>${ADDRESS}</strong>.</p>`,
  fees: `
    <p>Here is a quick summary while we prepare a full answer for you:</p>
    <ul>
      <li><strong>School fees:</strong> about KES 20,000 per term, including breakfast,
      lunch and an afternoon snack</li>
      <li><strong>Transport:</strong> about KES 7,000 per term</li>
      <li><strong>School hours:</strong> 8:00 AM – 3:00 PM, Monday to Friday</li>
    </ul>
    <p>We will get in touch to confirm the exact amounts and whether our transport covers
    your area.</p>`,
  admissions: `
    <p>The quickest way to secure a place is our short online application form — the
    link is just below.</p>`,
};

// Short introduction to Matan, added to every contact-form reply.
const MATAN_BRIEF = `
  <div style="margin-top: 24px; padding: 18px 20px; background: #f7f3ec; border-left: 4px solid #B68A4E;">
    <h3 style="margin: 0 0 8px; color: #7a1f1f;">About Matan Premier Kindergarten</h3>
    <p style="margin: 0 0 10px;">Matan is a warm, nurturing early-learning school in Kiamumbi
    that opened in 2026. Through play-based learning with gentle structure, our small classes
    help every child build early literacy, numeracy, confidence and independence.</p>
    <ul style="margin: 0 0 14px; padding-left: 20px;">
      <li><strong>Ages:</strong> 2 to 5 years (daycare, playgroup, PP1 and PP2)</li>
      <li><strong>School day:</strong> 8:00 AM – 3:00 PM, Monday to Friday</li>
      <li><strong>Meals:</strong> balanced breakfast and lunch, plus a snack before home time</li>
      <li><strong>School fees:</strong> about KES 20,000 per term (meals included)</li>
      <li><strong>Transport:</strong> available at about KES 7,000 per term</li>
      <li><strong>Location:</strong> ${ADDRESS}</li>
    </ul>
    <p style="margin: 0 0 6px;">Ready to join us? Apply online in about 5 minutes:</p>
    <a href="${SITE_URL}/apply.html" style="display: inline-block; background: #6A171A;
    color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 3px;">Apply Now</a>
  </div>`;

const APPLICATION_FIELDS: [string, string][] = [
  ['child_name', "Child's name"],
  ['child_dob', 'Date of birth'],
  ['child_gender', 'Gender'],
  ['class_applying', 'Class applying for'],
  ['start_date', 'Preferred start date'],
  ['previous_school', 'Previous school'],
  ['medical_notes', 'Allergies / medical'],
  ['parent_name', 'Parent / guardian'],
  ['relationship', 'Relationship'],
  ['parent_phone', 'Phone'],
  ['parent_email', 'Email'],
  ['home_area', 'Home area'],
  ['transport', 'Needs transport'],
  ['heard_from', 'Heard about us via'],
  ['extra_notes', 'Other notes'],
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function multiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function firstName(name: string): string {
  return escapeHtml(name.trim().split(/\s+/)[0] || name);
}

function layout(body: string): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 560px; line-height: 1.6;">
      ${body}
    </div>`;
}

function signature(): string {
  return `
    <p style="margin-top: 24px;">Warm regards,<br>Matan Premier Schools<br>
    ${PHONES}<br>
    <a href="${SITE_URL}">${SITE_URL.replace('https://', '')}</a></p>`;
}

function quote(text: string): string {
  return `
    <blockquote style="border-left: 3px solid #ccc; margin: 0; padding-left: 12px; color: #555;">
      ${multiline(text)}
    </blockquote>`;
}

function applicationTable(details: Record<string, unknown>): string {
  const rows = APPLICATION_FIELDS
    .filter(([key]) => details[key])
    .map(([key, label]) => `
      <tr>
        <td style="padding: 6px 12px 6px 0; color: #7a1f1f; vertical-align: top; white-space: nowrap;">
          <strong>${label}</strong>
        </td>
        <td style="padding: 6px 0;">${multiline(String(details[key]))}</td>
      </tr>`)
    .join('');

  return `<table style="border-collapse: collapse; font-size: 14px;">${rows}</table>`;
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

// ---------- Contact form ----------

function enquiryParentEmail(enquiry: Enquiry) {
  const topicReply = TOPIC_REPLIES[enquiry.topic ?? ''] ?? '';

  return {
    from: FROM_EMAIL,
    to: [enquiry.email],
    reply_to: SCHOOL_EMAIL,
    subject: 'Thank you for contacting Matan Premier Schools',
    html: layout(`
      <h2 style="color: #7a1f1f;">Thank you, ${firstName(enquiry.name)}!</h2>
      <p>We have received your message and a member of our team will get back to you
      within one working day.</p>
      ${topicReply}
      <p>For anything urgent, please call us on <strong>${PHONES}</strong>.</p>
      ${MATAN_BRIEF}
      <p style="margin-top: 24px;">Here is a copy of your message:</p>
      ${quote(enquiry.message)}
      <p style="margin-top: 16px;">You may also find a quick answer in our
      <a href="${SITE_URL}/faq.html">frequently asked questions</a>.</p>
      ${signature()}
    `),
  };
}

function enquirySchoolEmail(enquiry: Enquiry) {
  const topic = TOPIC_LABELS[enquiry.topic ?? ''] ?? 'General enquiry';
  const email = escapeHtml(enquiry.email);
  const phone = enquiry.phone ? escapeHtml(enquiry.phone) : 'Not provided';

  return {
    from: FROM_EMAIL,
    to: [SCHOOL_EMAIL],
    // Hitting "Reply" in the inbox goes straight to the parent.
    reply_to: enquiry.email,
    subject: `New enquiry (${topic}) from ${enquiry.name}`,
    html: layout(`
      <h2 style="color: #7a1f1f;">New website enquiry</h2>
      <p><strong>About:</strong> ${escapeHtml(topic)}<br>
      <strong>Name:</strong> ${escapeHtml(enquiry.name)}<br>
      <strong>Email:</strong> <a href="mailto:${email}">${email}</a><br>
      <strong>Phone:</strong> ${phone}</p>
      <p><strong>Message:</strong></p>
      ${quote(enquiry.message)}
      <p style="margin-top: 24px; font-size: 13px; color: #777;">
        Reply to this email to answer the parent directly, or manage all enquiries in the
        <a href="${SITE_URL}/admin.html">admin dashboard</a>.
      </p>
    `),
  };
}

// ---------- Admission application ----------

function admissionParentEmail(enquiry: Enquiry, details: Record<string, unknown>) {
  const child = escapeHtml(String(details.child_name ?? 'your child'));

  return {
    from: FROM_EMAIL,
    to: [enquiry.email],
    reply_to: SCHOOL_EMAIL,
    subject: `We've received the application for ${details.child_name ?? 'your child'}`,
    html: layout(`
      <h2 style="color: #7a1f1f;">Thank you, ${firstName(enquiry.name)}!</h2>
      <p>We have received your application for <strong>${child}</strong> to join
      Matan Premier Kindergarten. We are delighted that you are considering us.</p>
      <p><strong>What happens next:</strong></p>
      <ol>
        <li>Our team will review the application and call you within
        <strong>two working days</strong>.</li>
        <li>We will invite you and ${child} to visit the school and meet the teachers.</li>
        <li>We will then confirm the place, the start date and the fees.</li>
      </ol>
      <p>As a reminder, school fees are about <strong>KES 20,000 per term</strong>
      (meals included) and transport is about <strong>KES 7,000 per term</strong>.</p>
      <p style="margin-top: 24px;"><strong>A copy of your application:</strong></p>
      ${applicationTable(details)}
      <p style="margin-top: 16px;">If anything above is wrong, simply reply to this email.</p>
      ${signature()}
    `),
  };
}

function admissionSchoolEmail(enquiry: Enquiry, details: Record<string, unknown>) {
  return {
    from: FROM_EMAIL,
    to: [SCHOOL_EMAIL],
    reply_to: enquiry.email,
    subject: `New application: ${details.child_name ?? 'child'} – ${details.class_applying ?? ''}`,
    html: layout(`
      <h2 style="color: #7a1f1f;">New admission application</h2>
      ${applicationTable(details)}
      <p style="margin-top: 24px; font-size: 13px; color: #777;">
        The parent has been told you will call within two working days. Reply to this email
        to write to them directly, or see all applications in the
        <a href="${SITE_URL}/admin.html">admin dashboard</a>.
      </p>
    `),
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

  const emails = enquiry.type === 'admission' && enquiry.details
    ? [
      admissionParentEmail(enquiry, enquiry.details),
      admissionSchoolEmail(enquiry, enquiry.details),
    ]
    : [enquiryParentEmail(enquiry), enquirySchoolEmail(enquiry)];

  const results = await Promise.allSettled(emails.map(sendEmail));

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

// Marks this file as a module so editors do not share its names with admin.js.
export {};
