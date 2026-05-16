import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const adminCount = await db.user.count({
      where: { role: 'admin' },
    })

    return NextResponse.json({ adminExists: adminCount > 0 })
  } catch (error) {
    console.error('Check admin error:', error)
    return NextResponse.json({ error: 'حدث خطأ في التحقق من المسؤول' }, { status: 500 })
  }
}
