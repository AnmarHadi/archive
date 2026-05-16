import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get single correspondence
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const correspondence = await db.correspondence.findUnique({
      where: { id },
      include: {
        attachments: true,
        logs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!correspondence) {
      return NextResponse.json({ error: 'المراسلة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json({ data: correspondence })
  } catch (error) {
    console.error('Error fetching correspondence:', error)
    return NextResponse.json({ error: 'Failed to fetch correspondence' }, { status: 500 })
  }
}

// PUT - Update correspondence
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.correspondence.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'المراسلة غير موجودة' }, { status: 404 })
    }

    // Create log entry if status changed
    const updateData: any = { ...body }
    if (body.status && body.status !== existing.status) {
      updateData.logs = {
        create: {
          action: body.status === 'archived' ? 'archived' : 'status_change',
          fromStatus: existing.status,
          toStatus: body.status,
          fromUser: body.updatedBy,
          notes: body.statusNote || `تم تغيير الحالة من ${existing.status} إلى ${body.status}`,
        },
      }
    }

    // Remove non-schema fields
    delete updateData.updatedBy
    delete updateData.statusNote

    // Convert date strings to Date objects
    if (updateData.dateReceived) updateData.dateReceived = new Date(updateData.dateReceived)
    if (updateData.dateSent) updateData.dateSent = new Date(updateData.dateSent)
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate)

    if (body.status === 'archived') {
      updateData.archivedAt = new Date()
      updateData.archivedBy = body.updatedBy
    }

    const correspondence = await db.correspondence.update({
      where: { id },
      data: updateData,
      include: {
        attachments: true,
        logs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return NextResponse.json({ data: correspondence })
  } catch (error) {
    console.error('Error updating correspondence:', error)
    return NextResponse.json({ error: 'Failed to update correspondence' }, { status: 500 })
  }
}

// DELETE - Delete correspondence
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.correspondence.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'المراسلة غير موجودة' }, { status: 404 })
    }

    await db.correspondence.delete({ where: { id } })

    return NextResponse.json({ message: 'تم حذف المراسلة بنجاح' })
  } catch (error) {
    console.error('Error deleting correspondence:', error)
    return NextResponse.json({ error: 'Failed to delete correspondence' }, { status: 500 })
  }
}
