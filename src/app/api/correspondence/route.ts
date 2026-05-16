import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - List all correspondence with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    if (type) where.type = type
    if (status) where.status = status
    if (priority) where.priority = priority
    if (category) where.category = category
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { referenceNumber: { contains: search } },
        { senderName: { contains: search } },
        { recipientName: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [correspondence, total] = await Promise.all([
      db.correspondence.findMany({
        where,
        include: {
          attachments: true,
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.correspondence.count({ where }),
    ])

    return NextResponse.json({
      data: correspondence,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching correspondence:', error)
    return NextResponse.json({ error: 'Failed to fetch correspondence' }, { status: 500 })
  }
}

// POST - Create new correspondence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      referenceNumber,
      subject,
      type,
      category,
      priority,
      status,
      senderName,
      senderDept,
      recipientName,
      recipientDept,
      dateReceived,
      dateSent,
      dueDate,
      description,
      confidentiality,
      tags,
      createdBy,
    } = body

    // Check if reference number already exists
    const existing = await db.correspondence.findUnique({
      where: { referenceNumber },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'رقم المرجع موجود مسبقاً' },
        { status: 400 }
      )
    }

    const correspondence = await db.correspondence.create({
      data: {
        referenceNumber,
        subject,
        type,
        category,
        priority: priority || 'normal',
        status: status || 'pending',
        senderName,
        senderDept,
        recipientName,
        recipientDept,
        dateReceived: dateReceived ? new Date(dateReceived) : null,
        dateSent: dateSent ? new Date(dateSent) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        description,
        confidentiality: confidentiality || 'public',
        tags,
        createdBy,
        logs: {
          create: {
            action: 'created',
            toStatus: status || 'pending',
            fromUser: createdBy,
            notes: 'تم إنشاء المراسلة',
          },
        },
      },
      include: {
        attachments: true,
        logs: true,
      },
    })

    return NextResponse.json({ data: correspondence }, { status: 201 })
  } catch (error) {
    console.error('Error creating correspondence:', error)
    return NextResponse.json({ error: 'Failed to create correspondence' }, { status: 500 })
  }
}
