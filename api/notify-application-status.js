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

function corsHeaders(request) {
  const origin = request.headers.get('origin')
  const headers = new Headers()
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
  } else {
    headers.set('Access-Control-Allow-Origin', '*')
  }
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return headers
}

function json(request, data, status = 200) {
  const headers = corsHeaders(request)
  return Response.json(data, { status, headers })
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

/** Vercel Node runtime: default export with `fetch` (not legacy req/res). */
export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }
    if (request.method !== 'POST') {
      return json(request, { error: 'Method not allowed' }, 405)
    }

    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
      const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

      if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL')
      if (!anonKey) throw new Error('Missing SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY')
      if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

      const authHeader = String(request.headers.get('authorization') || '')
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
      if (!token) {
        return json(request, { error: 'Missing Authorization bearer token' }, 401)
      }

      const authClient = createClient(supabaseUrl, anonKey)
      const {
        data: { user },
        error: authErr,
      } = await authClient.auth.getUser(token)
      if (authErr || !user) {
        return json(request, { error: 'Invalid session' }, 401)
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
        return json(request, { error: 'Forbidden' }, 403)
      }

      const body = await request.json().catch(() => ({}))
      const applicationId = String(body.applicationId ?? '').trim()
      const status = toCanonicalStatus(body.status)
      if (!applicationId) {
        return json(request, { error: 'Missing applicationId' }, 400)
      }
      if (!status) {
        return json(request, { error: 'Invalid status (expected INTERVIEW/HIRED/REJECTED)' }, 400)
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
        return json(request, { error: 'Application not found' }, 404)
      }

      const toEmail = String(app?.applicants?.email ?? '').trim()
      if (!toEmail) {
        return json(request, { ok: true, skipped: true, reason: 'Applicant has no email' }, 200)
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
      return json(request, { ok: true, to: toEmail, status, resend: resendResult }, 200)
    } catch (e) {
      console.error('[notify-application-status]', e)
      return json(request, { error: String(e?.message ?? e) }, 500)
    }
  },
}
