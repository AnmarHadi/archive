import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// GET - List all investigation committees
export async function GET() {
  try {
    const committees = await db.investigationCommittee.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: committees })
  } catch (error) {
    console.error('Error fetching committees:', error)
    return NextResponse.json({ error: 'Failed to fetch committees' }, { status: 500 })
  }
}

// POST - Create investigation committee
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const name = formData.get('name') as string
    const chairmanName = formData.get('chairmanName') as string
    const administrativeOrderNo = formData.get('administrativeOrderNo') as string
    const administrativeOrderDate = formData.get('administrativeOrderDate') as string | null
    const notes = formData.get('notes') as string | null
    const orderCopy = formData.get('orderCopy') as File | null

    if (!name || !chairmanName || !administrativeOrderNo) {
      return NextResponse.json(
        { error: 'اسم اللجنة واسم الرئيس ورقم الأمر الإداري مطلوبون' },
        { status: 400 }
      )
    }

    let orderCopyPath: string | null = null
    let orderCopyFileName: string | null = null

    // Handle file upload
    if (orderCopy && orderCopy.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'committees')
      await mkdir(uploadsDir, { recursive: true })

      const bytes = await orderCopy.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const ext = path.extname(orderCopy.name) || '.png'
      const fileName = `committee-${uniqueSuffix}${ext}`
      const filePath = path.join(uploadsDir, fileName)

      await writeFile(filePath, buffer)

      orderCopyPath = `/uploads/committees/${fileName}`
      orderCopyFileName = orderCopy.name
    }

    const committee = await db.investigationCommittee.create({
      data: {
        name,
        chairmanName,
        administrativeOrderNo,
        administrativeOrderDate: administrativeOrderDate ? new Date(administrativeOrderDate) : null,
        orderCopyPath,
        orderCopyFileName,
        notes,
      },
    })

    return NextResponse.json({ data: committee }, { status: 201 })
  } catch (error) {
    console.error('Error creating committee:', error)
    return NextResponse.json({ error: 'Failed to create committee' }, { status: 500 })
  }
}
