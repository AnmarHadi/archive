import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Check if any admin already exists
    const adminCount = await db.user.count({
      where: { role: 'admin' },
    })

    if (adminCount > 0) {
      return NextResponse.json(
        { error: 'يوجد حساب مسؤول بالفعل. لا يمكن إنشاء حساب مسؤول جديد.' },
        { status: 403 }
      )
    }

    const { name, email, password, department } = await request.json()

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

    // Create admin user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        department: department || null,
        role: 'admin',
        isActive: true,
      },
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'تم إنشاء حساب المسؤول بنجاح',
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Admin setup error:', error)
    return NextResponse.json({ error: 'حدث خطأ في إنشاء حساب المسؤول' }, { status: 500 })
  }
}
