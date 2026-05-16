import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Seed departments
    const departments = [
      { name: 'الإدارة العامة', code: 'GEN', description: 'الإدارة العامة للمؤسسة', manager: 'أحمد محمد', phone: '01-2345678', email: 'gen@example.com' },
      { name: 'الشؤون المالية', code: 'FIN', description: 'إدارة الشؤون المالية والميزانيات', manager: 'خالد علي', phone: '01-2345679', email: 'fin@example.com' },
      { name: 'الموارد البشرية', code: 'HR', description: 'إدارة الموارد البشرية والتوظيف', manager: 'فاطمة حسن', phone: '01-2345680', email: 'hr@example.com' },
      { name: 'الشؤون القانونية', code: 'LAW', description: 'الاستشارات والشؤون القانونية', manager: 'عمر يوسف', phone: '01-2345681', email: 'law@example.com' },
      { name: 'تقنية المعلومات', code: 'IT', description: 'إدارة تقنية المعلومات والأنظمة', manager: 'سارة أحمد', phone: '01-2345682', email: 'it@example.com' },
      { name: 'العلاقات العامة', code: 'PR', description: 'إدارة العلاقات العامة والاتصال', manager: 'نورة سعد', phone: '01-2345683', email: 'pr@example.com' },
    ]

    for (const dept of departments) {
      await db.department.upsert({
        where: { code: dept.code },
        update: dept,
        create: dept,
      })
    }

    // Seed users
    const users = [
      { name: 'أحمد محمد', email: 'ahmed@example.com', password: 'hashed_password_1', role: 'admin', department: 'الإدارة العامة', isActive: true },
      { name: 'خالد علي', email: 'khaled@example.com', password: 'hashed_password_2', role: 'manager', department: 'الشؤون المالية', isActive: true },
      { name: 'فاطمة حسن', email: 'fatima@example.com', password: 'hashed_password_3', role: 'user', department: 'الموارد البشرية', isActive: true },
      { name: 'عمر يوسف', email: 'omar@example.com', password: 'hashed_password_4', role: 'user', department: 'الشؤون القانونية', isActive: true },
      { name: 'سارة أحمد', email: 'sara@example.com', password: 'hashed_password_5', role: 'manager', department: 'تقنية المعلومات', isActive: true },
    ]

    for (const user of users) {
      await db.user.upsert({
        where: { email: user.email },
        update: user,
        create: user,
      })
    }

    // Seed sample correspondence
    const correspondence = [
      {
        referenceNumber: 'IN-2026-001',
        subject: 'طلب اعتماد الميزانية السنوية',
        type: 'incoming',
        category: 'letter',
        priority: 'high',
        status: 'pending',
        senderName: 'وزارة المالية',
        senderDept: 'الشؤون المالية',
        recipientName: 'أحمد محمد',
        recipientDept: 'الإدارة العامة',
        dateReceived: new Date('2026-01-15'),
        description: 'طلب اعتماد الميزانية السنوية للعام المالي 2026',
        confidentiality: 'internal',
      },
      {
        referenceNumber: 'OUT-2026-001',
        subject: 'تقرير الأداء الربعي',
        type: 'outgoing',
        category: 'report',
        priority: 'normal',
        status: 'approved',
        senderName: 'خالد علي',
        senderDept: 'الشؤون المالية',
        recipientName: 'مجلس الإدارة',
        recipientDept: 'الإدارة العامة',
        dateSent: new Date('2026-02-01'),
        description: 'تقرير الأداء المالي للربع الأول من عام 2026',
        confidentiality: 'confidential',
      },
      {
        referenceNumber: 'IN-2026-002',
        subject: 'مذكرة بشأن تحديث السياسات الداخلية',
        type: 'incoming',
        category: 'memo',
        priority: 'urgent',
        status: 'in_review',
        senderName: 'فاطمة حسن',
        senderDept: 'الموارد البشرية',
        recipientName: 'أحمد محمد',
        recipientDept: 'الإدارة العامة',
        dateReceived: new Date('2026-03-10'),
        dueDate: new Date('2026-04-10'),
        description: 'مذكرة لتحديث سياسات الموارد البشرية وفق أحدث المعايير',
        confidentiality: 'internal',
      },
      {
        referenceNumber: 'OUT-2026-002',
        subject: 'عقد صيانة الأنظمة التقنية',
        type: 'outgoing',
        category: 'contract',
        priority: 'high',
        status: 'pending',
        senderName: 'سارة أحمد',
        senderDept: 'تقنية المعلومات',
        recipientName: 'شركة التقنية المتقدمة',
        recipientDept: 'الشؤون المالية',
        dateSent: new Date('2026-03-20'),
        description: 'عقد صيانة الأنظمة التقنية لمدة سنة قابلة للتجديد',
        confidentiality: 'confidential',
      },
      {
        referenceNumber: 'IN-2026-003',
        subject: 'تعميم بشأن الإجازات الرسمية',
        type: 'incoming',
        category: 'circular',
        priority: 'normal',
        status: 'archived',
        senderName: 'الإدارة العامة',
        senderDept: 'الإدارة العامة',
        recipientName: 'جميع الأقسام',
        recipientDept: 'الإدارة العامة',
        dateReceived: new Date('2026-01-01'),
        description: 'تعيم بشأن جدول الإجازات الرسمية لعام 2026',
        confidentiality: 'public',
        archivedAt: new Date('2026-01-05'),
        archivedBy: 'أحمد محمد',
      },
      {
        referenceNumber: 'IN-2026-004',
        subject: 'رأي قانوني حول العقد التجاري',
        type: 'incoming',
        category: 'letter',
        priority: 'high',
        status: 'pending',
        senderName: 'الشؤون القانونية',
        senderDept: 'الشؤون القانونية',
        recipientName: 'خالد علي',
        recipientDept: 'الشؤون المالية',
        dateReceived: new Date('2026-04-05'),
        dueDate: new Date('2026-04-20'),
        description: 'طلب رأي قانوني حول الشروط والأحكام في العقد التجاري الجديد',
        confidentiality: 'secret',
      },
      {
        referenceNumber: 'OUT-2026-003',
        subject: 'قرار تشكيل لجنة المراجعة',
        type: 'outgoing',
        category: 'decision',
        priority: 'urgent',
        status: 'approved',
        senderName: 'أحمد محمد',
        senderDept: 'الإدارة العامة',
        recipientName: 'جميع الأقسام',
        recipientDept: 'الإدارة العامة',
        dateSent: new Date('2026-03-15'),
        description: 'قرار بتشكيل لجنة المراجعة الداخلية للنصف الأول من عام 2026',
        confidentiality: 'internal',
      },
      {
        referenceNumber: 'IN-2026-005',
        subject: 'دعوة لحضور المؤتمر السنوي',
        type: 'incoming',
        category: 'letter',
        priority: 'low',
        status: 'pending',
        senderName: 'غرفة التجارة',
        senderDept: 'العلاقات العامة',
        recipientName: 'نورة سعد',
        recipientDept: 'العلاقات العامة',
        dateReceived: new Date('2026-04-01'),
        description: 'دعوة لحضور المؤتمر السنوي للتجارة والاستثمار',
        confidentiality: 'public',
      },
      {
        referenceNumber: 'OUT-2026-004',
        subject: 'تقرير متابعة المشاريع',
        type: 'outgoing',
        category: 'report',
        priority: 'normal',
        status: 'in_review',
        senderName: 'سارة أحمد',
        senderDept: 'تقنية المعلومات',
        recipientName: 'أحمد محمد',
        recipientDept: 'الإدارة العامة',
        dateSent: new Date('2026-04-10'),
        description: 'تقرير متابعة مشاريع التحول الرقمي والبنية التحتية التقنية',
        confidentiality: 'internal',
      },
      {
        referenceNumber: 'IN-2026-006',
        subject: 'شكوى بشأن تأخر الصرف',
        type: 'incoming',
        category: 'letter',
        priority: 'urgent',
        status: 'rejected',
        senderName: 'مقاول البناء',
        senderDept: 'الشؤون المالية',
        recipientName: 'خالد علي',
        recipientDept: 'الشؤون المالية',
        dateReceived: new Date('2026-03-25'),
        dueDate: new Date('2026-04-15'),
        description: 'شكوى من المقاول بشأن تأخر صرف المستحقات المالية',
        confidentiality: 'confidential',
      },
    ]

    for (const corr of correspondence) {
      const existing = await db.correspondence.findUnique({
        where: { referenceNumber: corr.referenceNumber },
      })
      if (!existing) {
        await db.correspondence.create({
          data: {
            ...corr,
            logs: {
              create: {
                action: 'created',
                toStatus: corr.status,
                notes: 'تم إنشاء المراسلة',
              },
            },
          },
        })
      }
    }

    return NextResponse.json({ message: 'تم تهيئة البيانات بنجاح' })
  } catch (error) {
    console.error('Error seeding data:', error)
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 })
  }
}
