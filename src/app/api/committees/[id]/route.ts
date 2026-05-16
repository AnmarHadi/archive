import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'

// GET - Get committee by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const committee = await db.investigationCommittee.findUnique({
      where: { id },
    })
    if (!committee) {
      return NextResponse.json({ error: 'اللجنة غير موجودة' }, { status: 404 })
    }
    return NextResponse.json({ data: committee })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch committee' }, { status: 500 })
  }
}

// DELETE - Delete committee
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const committee = await db.investigationCommittee.findUnique({
      where: { id },
    })
    if (!committee) {
      return NextResponse.json({ error: 'اللجنة غير موجودة' }, { status: 404 })
    }

    // Delete uploaded file if exists
    if (committee.orderCopyPath) {
      try {
        const filePath = path.join(process.cwd(), 'public', committee.orderCopyPath)
        await unlink(filePath)
      } catch {
        // File might not exist, continue
      }
    }

    await db.investigationCommittee.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete committee' }, { status: 500 })
  }
}
