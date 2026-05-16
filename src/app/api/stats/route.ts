import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [
      totalIncoming,
      totalOutgoing,
      pendingCount,
      archivedCount,
      urgentCount,
      todayCount,
      recentCorrespondence,
      categoryStats,
      monthlyStats,
    ] = await Promise.all([
      db.correspondence.count({ where: { type: 'incoming' } }),
      db.correspondence.count({ where: { type: 'outgoing' } }),
      db.correspondence.count({ where: { status: 'pending' } }),
      db.correspondence.count({ where: { status: 'archived' } }),
      db.correspondence.count({ where: { priority: 'urgent' } }),
      db.correspondence.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      db.correspondence.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { attachments: true },
      }),
      db.correspondence.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      db.correspondence.findMany({
        select: {
          createdAt: true,
          type: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ])

    // Process monthly stats
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

    const monthlyData: Record<string, { incoming: number; outgoing: number }> = {}
    monthlyStats.forEach((item) => {
      const date = new Date(item.createdAt)
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      if (!monthlyData[key]) monthlyData[key] = { incoming: 0, outgoing: 0 }
      if (item.type === 'incoming') monthlyData[key].incoming++
      else monthlyData[key].outgoing++
    })

    // Status distribution
    const statusStats = await db.correspondence.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    // Priority distribution
    const priorityStats = await db.correspondence.groupBy({
      by: ['priority'],
      _count: { id: true },
    })

    return NextResponse.json({
      data: {
        totalIncoming,
        totalOutgoing,
        totalCorrespondence: totalIncoming + totalOutgoing,
        pendingCount,
        archivedCount,
        urgentCount,
        todayCount,
        recentCorrespondence,
        categoryStats: categoryStats.map(c => ({
          category: c.category,
          count: c._count.id,
        })),
        monthlyData: Object.entries(monthlyData).map(([month, data]) => ({
          month,
          ...data,
        })),
        statusStats: statusStats.map(s => ({
          status: s.status,
          count: s._count.id,
        })),
        priorityStats: priorityStats.map(p => ({
          priority: p.priority,
          count: p._count.id,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
