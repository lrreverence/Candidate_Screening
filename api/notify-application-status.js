import { createClient } from '@supabase/supabase-js'

function toCanonicalStatus(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (s === 'INTERVIEW' || s === 'HIRED' || s === 'REJECTED') return s
  return null
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function sendResendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY || ''
  const from = process.env.RESEND_FROM || ''
  if (!apiKey) throw new Error('Missing RESEND_API_KEY')
  if (!from) throw new Error('Missing RESEND_FROM')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Resend error (${res.status}): ${text}`)
  return text
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function setCors(req, res) {
  const origin = req.headers?.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

async function parseJsonBody(req) {
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body
  }
  return readJsonBody(req)
}

export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL')
    if (!anonKey) throw new Error('Missing SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY')
    if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

    const authHeader = String(req.headers?.authorization || '')
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!token) {
      res.status(401).json({ error: 'Missing Authorization bearer token' })
      return
    }

    const authClient = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser(token)
    if (authErr || !user) {
      res.status(401).json({ error: 'Invalid session' })
      return
    }

    const scoped = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: profile, error: profileErr } = await scoped
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profileErr) throw profileErr
    if (profile?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const body = await parseJsonBody(req)
    const applicationId = String(body.applicationId ?? '').trim()
    const status = toCanonicalStatus(body.status)
    if (!applicationId) {
      res.status(400).json({ error: 'Missing applicationId' })
      return
    }
    if (!status) {
      res.status(400).json({ error: 'Invalid status (expected INTERVIEW/HIRED/REJECTED)' })
      return
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: app, error: appErr } = await admin
      .from('applications')
      .select(
        `
        id,
        status,
        rejection_reason,
        applicants:applicant_id (
          email,
          first_name,
          last_name
        ),
        jobs:job_id (
          title
        )
      `
      )
      .eq('id', applicationId)
      .maybeSingle()

    if (appErr) throw appErr
    if (!app) {
      res.status(404).json({ error: 'Application not found' })
      return
    }

    const toEmail = String(app?.applicants?.email ?? '').trim()
    if (!toEmail) {
      res.status(200).json({ ok: true, skipped: true, reason: 'Applicant has no email' })
      return
    }

    const firstName = String(app?.applicants?.first_name ?? '').trim()
    const jobTitle = String(app?.jobs?.title ?? 'your application').trim()
    const safeJobTitle = escapeHtml(jobTitle)

    let subject = ''
    let headline = ''
    let extraHtml = ''

    if (status === 'INTERVIEW') {
      subject = `Interview update — ${jobTitle}`
      headline = 'You’ve been selected for interview.'
      extraHtml = '<p>Our team will contact you with next steps and scheduling details.</p>'
    } else if (status === 'HIRED') {
      subject = `Hiring update — ${jobTitle}`
      headline = 'Congratulations — you’ve been hired.'
      extraHtml = '<p>We’ll reach out shortly with onboarding details.</p>'
    } else {
      subject = `Application update — ${jobTitle}`
      headline = 'Your application has been reviewed.'
      const reason = String(app?.rejection_reason ?? '').trim()
      if (reason) {
        extraHtml = `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>`
      }
    }

    const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,'
    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5; color: #0f172a;">
        <p style="margin: 0 0 12px;">${greeting}</p>
        <p style="margin: 0 0 12px;"><strong>${escapeHtml(headline)}</strong></p>
        <p style="margin: 0 0 12px;">Position: <strong>${safeJobTitle}</strong></p>
        ${extraHtml}
        <p style="margin: 16px 0 0; color: #475569; font-size: 12px;">
          Please do not reply to this automated email.
        </p>
      </div>
    `.trim()

    const resendResult = await sendResendEmail({ to: toEmail, subject, html })
    res.status(200).json({ ok: true, to: toEmail, status, resend: resendResult })
  } catch (e) {
    console.error('[notify-application-status]', e)
    res.status(500).json({ error: String(e?.message ?? e) })
  }
}
