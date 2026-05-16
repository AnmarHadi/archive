import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - List all users
export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ data: users })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST - Create user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await db.user.create({ data: body })
    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({ data: userWithoutPassword }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
