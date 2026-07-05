export type FeedbackConfirmationParams = {
  userName?: string | null
  typeLabel: string
  rating: number
  contentPreview: string
  ticketId?: string | null
}

export function buildFeedbackConfirmationEmail(params: FeedbackConfirmationParams) {
  const greeting = params.userName?.trim() ? `Xin chào ${params.userName.trim()},` : 'Xin chào,'
  const preview =
    params.contentPreview.length > 120
      ? `${params.contentPreview.slice(0, 120)}…`
      : params.contentPreview
  const ticketLine = params.ticketId
    ? `Mã tham chiếu: ${params.ticketId}`
    : 'Góp ý của bạn đã được lưu trong hệ thống.'

  const subject = 'SpatialGeometry — Đã nhận góp ý của bạn'

  const text = [
    greeting,
    '',
    'Cảm ơn bạn đã gửi góp ý cho SpatialGeometry (Vẽ hình không "khó").',
    '',
    `Loại góp ý: ${params.typeLabel}`,
    `Đánh giá: ${params.rating}/10`,
    `Nội dung: ${preview}`,
    '',
    ticketLine,
    '',
    'Đây là email tự động. Bạn không cần trả lời thư này.',
    '',
    'Trân trọng,',
    'Đội ngũ SpatialGeometry',
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html lang="vi">
<body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#1f2937;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h1 style="font-size:18px;margin:0 0 12px;">Đã nhận góp ý của bạn</h1>
    <p style="margin:0 0 12px;">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 16px;">Cảm ơn bạn đã gửi góp ý cho <strong>SpatialGeometry</strong> (Vẽ hình không &quot;khó&quot;).</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;width:120px;">Loại góp ý</td>
        <td style="padding:8px 0;font-weight:600;">${escapeHtml(params.typeLabel)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Đánh giá</td>
        <td style="padding:8px 0;font-weight:600;">${params.rating}/10</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;vertical-align:top;">Nội dung</td>
        <td style="padding:8px 0;">${escapeHtml(preview)}</td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:13px;color:#4b5563;">${escapeHtml(ticketLine)}</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">Đây là email tự động. Bạn không cần trả lời thư này.</p>
  </div>
</body>
</html>`.trim()

  return { subject, text, html }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
