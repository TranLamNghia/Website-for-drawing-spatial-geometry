import nodemailer from 'nodemailer'
import {
  buildFeedbackConfirmationEmail,
  type FeedbackConfirmationParams,
} from '@/lib/email-templates/feedback-confirmation'

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS
  const secure =
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || port === 465

  if (!host || !user || !pass) {
    return null
  }

  return { host, port, secure, user, pass }
}

function getFromAddress() {
  const email = process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim()
  const name = process.env.MAIL_FROM_NAME?.trim() || 'SpatialGeometry'

  if (!email) return null
  return `"${name}" <${email}>`
}

export async function sendFeedbackConfirmation(params: {
  to: string
} & FeedbackConfirmationParams): Promise<boolean> {
  const smtp = getSmtpConfig()
  const from = getFromAddress()

  if (!smtp || !from) {
    console.error('[mail] SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS / MAIL_FROM).')
    return false
  }

  try {
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    })

    const email = buildFeedbackConfirmationEmail(params)

    await transport.sendMail({
      from,
      to: params.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    })

    return true
  } catch (error) {
    console.error('[mail] Failed to send confirmation email:', error)
    return false
  }
}
