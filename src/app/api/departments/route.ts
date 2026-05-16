import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - List all departments
export async function GET() {
  try {
    const departments = await db.department.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: departments })
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }
}

// POST - Create department
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const department = await db.department.create({ data: body })
    return NextResponse.json({ data: department }, { status: 201 })
  } catch (error) {
    console.error('Error creating department:', error)
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
  }
}
