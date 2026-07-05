import { google } from 'googleapis'
import {
  buildFeedbackConfirmationEmail,
  type FeedbackConfirmationParams,
} from '@/lib/email-templates/feedback-confirmation'

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Thiếu cấu hình Gmail (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GMAIL_REFRESH_TOKEN).')
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

function encodeSubject(subject: string) {
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`
}

function buildRawMessage(params: {
  from: string
  to: string
  subject: string
  text: string
  html: string
}) {
  const boundary = `sg_boundary_${Date.now()}`
  const lines = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${encodeSubject(params.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    params.text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    params.html,
    '',
    `--${boundary}--`,
  ]

  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function sendFeedbackConfirmation(params: {
  to: string
} & FeedbackConfirmationParams): Promise<boolean> {
  const from = process.env.GMAIL_SENDER_EMAIL?.trim()
  if (!from) {
    console.error('[gmail] GMAIL_SENDER_EMAIL is not configured.')
    return false
  }

  try {
    const auth = getOAuthClient()
    const gmail = google.gmail({ version: 'v1', auth })
    const email = buildFeedbackConfirmationEmail(params)
    const raw = buildRawMessage({
      from,
      to: params.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    })

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    })

    return true
  } catch (error) {
    console.error('[gmail] Failed to send confirmation email:', error)
    return false
  }
}
