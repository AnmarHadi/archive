import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

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

// POST - Create user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization via x-user-id header
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'غير مصرح. يجب تسجيل الدخول.' },
        { status: 401 }
      )
    }

    const requestingUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })

    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'غير مصرح. فقط مدير النظام يمكنه إنشاء مستخدمين جدد.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, password, role, department } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبون' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } })

    if (existingUser) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مستخدم بالفعل' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        department: department || null,
        role: role || 'user',
        isActive: true,
      },
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ data: userWithoutPassword }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
