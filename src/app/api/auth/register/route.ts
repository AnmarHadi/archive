import { NextResponse } from 'next/server'

// Public registration is disabled. Only admins can create new users.
export async function POST() {
  return NextResponse.json(
    { error: 'التسجيل العام معطل. تواصل مع مسؤول النظام لإنشاء حساب.' },
    { status: 403 }
  )
}
