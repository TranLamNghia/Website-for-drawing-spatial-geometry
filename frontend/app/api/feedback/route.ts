import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

function loadRootEnv() {
  const envPath = path.resolve(process.cwd(), '..', '.env')
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, 'utf8')
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) return

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()

    if (!process.env[key]) {
      process.env[key] = value
    }
  })
}

loadRootEnv()

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_ID?.trim()
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID?.trim().replace(/\.+$/, '')
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Report'
const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME?.trim()
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY?.trim()
const CLOUDINARY_SECRET_KEY = process.env.CLOUDINARY_SECRET_KEY?.trim()
const CLOUDINARY_FOLDER = 'SpatialGeometry/feedback'

export async function POST(request: Request) {
  try {
    if (!AIRTABLE_TOKEN) {
      return NextResponse.json({ message: 'Cấu hình cơ sở dữ liệu không hợp lệ (1).' }, { status: 500 })
    }

    if (!AIRTABLE_BASE_ID) {
      return NextResponse.json({ message: 'Cấu hình cơ sở dữ liệu không hợp lệ (2).' }, { status: 500 })
    }

    if (!CLOUDINARY_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_SECRET_KEY) {
      return NextResponse.json({ message: 'Cấu hình lưu trữ tệp không hợp lệ.' }, { status: 500 })
    }

    const formData = await request.formData()
    const email = String(formData.get('email') || '').trim()
    const content = String(formData.get('content') || '').trim()
    const typeLabel = String(formData.get('type') || '').trim()
    const rating = Number(formData.get('rating') || 0)
    const attachmentFiles = formData
      .getAll('attachments')
      .filter((item): item is File => item instanceof File)
      .filter(file => file.size > 0)

    const ReportType: Record<string, string> = {
      "Báo lỗi hệ thống": "SystemBug",
      "Đề xuất tính năng mới": "NewFeatureRequest",
      "Góp ý giao diện/trải nghiệm": "UIUXSuggestion",
      "Ý kiến khác": "Other"
    }

    const type = ReportType[typeLabel]

    if (!email || !content || !type || !Number.isFinite(rating) || rating <= 0) {
      return NextResponse.json({ message: 'Dữ liệu góp ý không hợp lệ.' }, { status: 400 })
    }

    const attachmentPayload = await Promise.all(
      attachmentFiles.map(async file => {
        const bytes = Buffer.from(await file.arrayBuffer())
        const timestamp = Math.floor(Date.now() / 1000).toString()
        const signaturePayload = `folder=${CLOUDINARY_FOLDER}&timestamp=${timestamp}${CLOUDINARY_SECRET_KEY}`
        const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex')
        const formData = new FormData()
        formData.append('file', new Blob([bytes], { type: file.type || 'image/png' }), file.name)
        formData.append('api_key', CLOUDINARY_API_KEY)
        formData.append('timestamp', timestamp)
        formData.append('folder', CLOUDINARY_FOLDER)
        formData.append('signature', signature)

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        })

        const uploadResult = await uploadResponse.json().catch(() => null)
        if (!uploadResponse.ok) {
          throw new Error(uploadResult?.error?.message || 'Không thể tải lên tệp đính kèm.')
        }

        return {
          url: uploadResult.secure_url as string,
          filename: file.name,
        }
      }),
    )

    const fields: Record<string, unknown> = {
      EmailUser: email,
      Star: rating,
      TypeReport: type,
      Content: content,
    }

    if (attachmentPayload.length > 0) {
      fields.Attachments = attachmentPayload
    }

    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?typecast=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{ fields }],
        }),
      },
    )

    const responseText = await airtableResponse.text()
    if (!airtableResponse.ok) {
      return NextResponse.json(
        { message: 'Không thể gửi góp ý vào hệ thống lúc này.', detail: responseText },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, data: responseText ? JSON.parse(responseText) : null })
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Không thể gửi góp ý lúc này.', detail: error?.message || String(error) },
      { status: 500 },
    )
  }
}
