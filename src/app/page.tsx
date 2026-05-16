'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive, Inbox, Send, Search, BarChart3, Users, Building2, Plus,
  FileText, Clock, AlertTriangle, CheckCircle2, XCircle, Eye,
  Filter, ChevronDown, MoreHorizontal, Edit, Trash2, X, Menu,
  Home, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar,
  Tag, Shield, BookOpen, Settings, Bell, LogOut, RefreshCw,
  ChevronLeft, ChevronRight, Hash, UserCircle, Mail, Phone,
  Building, ClipboardList, AlertCircle, FileCheck, FileX,
  FileClock, Lock, Globe, Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'

// Types
interface Correspondence {
  id: string
  referenceNumber: string
  subject: string
  type: string
  category: string
  priority: string
  status: string
  senderName: string | null
  senderDept: string | null
  recipientName: string | null
  recipientDept: string | null
  dateReceived: string | null
  dateSent: string | null
  dueDate: string | null
  description: string | null
  confidentiality: string
  tags: string | null
  archivedAt: string | null
  archivedBy: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
  attachments: Attachment[]
  logs: CorrespondenceLog[]
}

interface Attachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  uploadedAt: string
}

interface CorrespondenceLog {
  id: string
  action: string
  fromStatus: string | null
  toStatus: string | null
  fromUser: string | null
  toUser: string | null
  notes: string | null
  createdAt: string
}

interface Department {
  id: string
  name: string
  code: string
  description: string | null
  manager: string | null
  phone: string | null
  email: string | null
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  isActive: boolean
  createdAt: string
}

interface Stats {
  totalIncoming: number
  totalOutgoing: number
  totalCorrespondence: number
  pendingCount: number
  archivedCount: number
  urgentCount: number
  todayCount: number
  recentCorrespondence: Correspondence[]
  categoryStats: { category: string; count: number }[]
  monthlyData: { month: string; incoming: number; outgoing: number }[]
  statusStats: { status: string; count: number }[]
  priorityStats: { priority: string; count: number }[]
}

// Utility functions
const getPriorityLabel = (priority: string) => {
  const map: Record<string, string> = {
    urgent: 'عاجل',
    high: 'مرتفع',
    normal: 'عادي',
    low: 'منخفض',
  }
  return map[priority] || priority
}

const getPriorityColor = (priority: string) => {
  const map: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    normal: 'bg-blue-100 text-blue-800 border-blue-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200',
  }
  return map[priority] || 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'قيد الانتظار',
    in_review: 'قيد المراجعة',
    approved: 'معتمد',
    rejected: 'مرفوض',
    archived: 'مؤرشف',
    returned: 'مرتجع',
  }
  return map[status] || status
}

const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    in_review: 'bg-blue-100 text-blue-800 border-blue-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    archived: 'bg-gray-100 text-gray-700 border-gray-200',
    returned: 'bg-purple-100 text-purple-800 border-purple-200',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

const getCategoryLabel = (category: string) => {
  const map: Record<string, string> = {
    letter: 'كتاب رسمي',
    memo: 'مذكرة',
    circular: 'تعميم',
    decision: 'قرار',
    report: 'تقرير',
    contract: 'عقد',
  }
  return map[category] || category
}

const getCategoryIcon = (category: string) => {
  const map: Record<string, React.ReactNode> = {
    letter: <FileText className="h-4 w-4" />,
    memo: <ClipboardList className="h-4 w-4" />,
    circular: <BookOpen className="h-4 w-4" />,
    decision: <FileCheck className="h-4 w-4" />,
    report: <BarChart3 className="h-4 w-4" />,
    contract: <Layers className="h-4 w-4" />,
  }
  return map[category] || <FileText className="h-4 w-4" />
}

const getConfidentialityLabel = (conf: string) => {
  const map: Record<string, string> = {
    public: 'عام',
    internal: 'داخلي',
    confidential: 'سري',
    secret: 'سري للغاية',
  }
  return map[conf] || conf
}

const getConfidentialityIcon = (conf: string) => {
  const map: Record<string, React.ReactNode> = {
    public: <Globe className="h-3.5 w-3.5" />,
    internal: <Building className="h-3.5 w-3.5" />,
    confidential: <Lock className="h-3.5 w-3.5" />,
    secret: <Shield className="h-3.5 w-3.5" />,
  }
  return map[conf] || <Globe className="h-3.5 w-3.5" />
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Navigation types
type PageType = 'dashboard' | 'incoming' | 'outgoing' | 'search' | 'reports' | 'departments' | 'users'

// Auth types
interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  isActive: boolean
}

export default function ArchiveApp() {
  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [adminExists, setAdminExists] = useState(false)
  const [adminSetupMode, setAdminSetupMode] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [setupName, setSetupName] = useState('')
  const [setupEmail, setSetupEmail] = useState('')
  const [setupPassword, setSetupPassword] = useState('')
  const [setupDept, setSetupDept] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)

  // Add user dialog state
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('user')
  const [newUserDept, setNewUserDept] = useState('')
  const [addUserSubmitting, setAddUserSubmitting] = useState(false)

  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCorrespondence, setSelectedCorrespondence] = useState<Correspondence | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [newCorrType, setNewCorrType] = useState<'incoming' | 'outgoing'>('incoming')
  const { toast } = useToast()

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // New correspondence form
  const [formData, setFormData] = useState({
    referenceNumber: '',
    subject: '',
    type: 'incoming' as 'incoming' | 'outgoing',
    category: 'letter',
    priority: 'normal',
    senderName: '',
    senderDept: '',
    recipientName: '',
    recipientDept: '',
    dateReceived: '',
    dateSent: '',
    dueDate: '',
    description: '',
    confidentiality: 'public',
    tags: '',
  })

  // Fetch data
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (data.data) setStats(data.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  const fetchCorrespondence = useCallback(async (type?: string) => {
    try {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
      if (filterPriority && filterPriority !== 'all') params.set('priority', filterPriority)
      if (filterCategory && filterCategory !== 'all') params.set('category', filterCategory)
      if (searchQuery) params.set('search', searchQuery)
      params.set('limit', '50')

      const res = await fetch(`/api/correspondence?${params.toString()}`)
      const data = await res.json()
      if (data.data) setCorrespondence(data.data)
    } catch (error) {
      console.error('Error fetching correspondence:', error)
    }
  }, [filterStatus, filterPriority, filterCategory, searchQuery])

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments')
      const data = await res.json()
      if (data.data) setDepartments(data.data)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (data.data) setUsers(data.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  // Check session and admin status on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const stored = localStorage.getItem('archive_user')
        if (stored) {
          const user = JSON.parse(stored)
          setAuthUser(user)
        }

        // Check if admin exists
        const adminRes = await fetch('/api/auth/check-admin')
        const adminData = await adminRes.json()
        setAdminExists(adminData.adminExists)

        // If no admin and no stored user, show setup mode
        if (!adminData.adminExists && !stored) {
          setAdminSetupMode(true)
        }
      } catch (e) {
        localStorage.removeItem('archive_user')
      }
      setAuthLoading(false)
    }
    checkSession()
  }, [])

  // Auth handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setAuthUser(data.user)
        localStorage.setItem('archive_user', JSON.stringify(data.user))
        toast({ title: `مرحباً ${data.user.name}` })
      } else {
        setAuthError(data.error || 'حدث خطأ')
      }
    } catch {
      setAuthError('حدث خطأ في الاتصال')
    }
    setAuthSubmitting(false)
  }

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthSubmitting(true)
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: setupName,
          email: setupEmail,
          password: setupPassword,
          department: setupDept,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAuthUser(data.user)
        setAdminExists(true)
        setAdminSetupMode(false)
        localStorage.setItem('archive_user', JSON.stringify(data.user))
        toast({ title: `مرحباً ${data.user.name}، تم إنشاء حساب المسؤول بنجاح` })
      } else {
        setAuthError(data.error || 'حدث خطأ')
      }
    } catch {
      setAuthError('حدث خطأ في الاتصال')
    }
    setAuthSubmitting(false)
  }

  const handleAddUser = async () => {
    if (!authUser) return
    setAddUserSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': authUser.id,
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          department: newUserDept,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'تم إنشاء المستخدم بنجاح' })
        setShowAddUserDialog(false)
        setNewUserName('')
        setNewUserEmail('')
        setNewUserPassword('')
        setNewUserRole('user')
        setNewUserDept('')
        fetchUsers()
      } else {
        toast({ title: data.error || 'حدث خطأ', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'حدث خطأ في الاتصال', variant: 'destructive' })
    }
    setAddUserSubmitting(false)
  }

  const handleLogout = () => {
    setAuthUser(null)
    localStorage.removeItem('archive_user')
    toast({ title: 'تم تسجيل الخروج بنجاح' })
  }

  const seedData = useCallback(async () => {
    try {
      await fetch('/api/seed', { method: 'POST' })
      toast({ title: 'تم تهيئة البيانات بنجاح' })
      fetchStats()
      fetchCorrespondence()
      fetchDepartments()
      fetchUsers()
    } catch (error) {
      console.error('Error seeding data:', error)
    }
  }, [fetchStats, fetchCorrespondence, fetchDepartments, fetchUsers, toast])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchStats(), fetchCorrespondence(), fetchDepartments(), fetchUsers()])
      setLoading(false)
    }
    init()
  }, [fetchStats, fetchCorrespondence, fetchDepartments, fetchUsers])

  useEffect(() => {
    const fetchForPage = async () => {
      try {
        const params = new URLSearchParams()
        if (currentPage === 'incoming') params.set('type', 'incoming')
        else if (currentPage === 'outgoing') params.set('type', 'outgoing')
        if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
        if (filterPriority && filterPriority !== 'all') params.set('priority', filterPriority)
        if (filterCategory && filterCategory !== 'all') params.set('category', filterCategory)
        if (searchQuery) params.set('search', searchQuery)
        params.set('limit', '50')

        const res = await fetch(`/api/correspondence?${params.toString()}`)
        const data = await res.json()
        if (data.data) setCorrespondence(data.data)
      } catch (error) {
        console.error('Error fetching correspondence:', error)
      }
    }
    if (currentPage === 'incoming' || currentPage === 'outgoing' || currentPage === 'search') {
      fetchForPage()
    }
  }, [currentPage, filterStatus, filterPriority, filterCategory, searchQuery])

  // Create correspondence
  const handleCreate = async () => {
    try {
      const res = await fetch('/api/correspondence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'تم إنشاء المراسلة بنجاح' })
        setShowNewDialog(false)
        resetForm()
        fetchCorrespondence(newCorrType)
        fetchStats()
      } else {
        toast({ title: data.error || 'حدث خطأ', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'حدث خطأ في الاتصال', variant: 'destructive' })
    }
  }

  // Update correspondence status
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/correspondence/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, updatedBy: 'المستخدم الحالي' }),
      })
      if (res.ok) {
        toast({ title: 'تم تحديث الحالة بنجاح' })
        fetchCorrespondence()
        fetchStats()
        if (selectedCorrespondence?.id === id) {
          const detailRes = await fetch(`/api/correspondence/${id}`)
          const detailData = await detailRes.json()
          if (detailData.data) setSelectedCorrespondence(detailData.data)
        }
      }
    } catch (error) {
      toast({ title: 'حدث خطأ', variant: 'destructive' })
    }
  }

  // Delete correspondence
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/correspondence/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'تم حذف المراسلة بنجاح' })
        fetchCorrespondence()
        fetchStats()
        setShowViewDialog(false)
        setSelectedCorrespondence(null)
      }
    } catch (error) {
      toast({ title: 'حدث خطأ', variant: 'destructive' })
    }
  }

  const resetForm = () => {
    setFormData({
      referenceNumber: '',
      subject: '',
      type: newCorrType,
      category: 'letter',
      priority: 'normal',
      senderName: '',
      senderDept: '',
      recipientName: '',
      recipientDept: '',
      dateReceived: '',
      dateSent: '',
      dueDate: '',
      description: '',
      confidentiality: 'public',
      tags: '',
    })
  }

  const openNewDialog = (type: 'incoming' | 'outgoing') => {
    setNewCorrType(type)
    setFormData(prev => ({ ...prev, type }))
    setShowNewDialog(true)
  }

  const viewCorrespondence = async (id: string) => {
    try {
      const res = await fetch(`/api/correspondence/${id}`)
      const data = await res.json()
      if (data.data) {
        setSelectedCorrespondence(data.data)
        setShowViewDialog(true)
      }
    } catch (error) {
      console.error('Error fetching correspondence detail:', error)
    }
  }

  // Navigation items (filtered by role)
  const allNavItems = [
    { id: 'dashboard' as PageType, label: 'لوحة التحكم', icon: <Home className="h-5 w-5" />, adminOnly: false },
    { id: 'incoming' as PageType, label: 'الوارد', icon: <Inbox className="h-5 w-5" />, adminOnly: false },
    { id: 'outgoing' as PageType, label: 'الصادر', icon: <Send className="h-5 w-5" />, adminOnly: false },
    { id: 'search' as PageType, label: 'البحث المتقدم', icon: <Search className="h-5 w-5" />, adminOnly: false },
    { id: 'reports' as PageType, label: 'التقارير', icon: <BarChart3 className="h-5 w-5" />, adminOnly: false },
    { id: 'departments' as PageType, label: 'الأقسام', icon: <Building2 className="h-5 w-5" />, adminOnly: false },
    { id: 'users' as PageType, label: 'المستخدمون', icon: <Users className="h-5 w-5" />, adminOnly: true },
  ]

  const navItems = allNavItems.filter(item => !item.adminOnly || authUser?.role === 'admin')

  // ============= RENDER SECTIONS =============

  // Dashboard Section
  const renderDashboard = () => {
    if (!stats) return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <Card className="border-r-4 border-r-emerald-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي المراسلات</p>
                    <p className="text-3xl font-bold mt-1">{stats.totalCorrespondence}</p>
                    <p className="text-xs text-muted-foreground mt-1">جميع المراسلات</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Archive className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-r-4 border-r-blue-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الوارد</p>
                    <p className="text-3xl font-bold mt-1">{stats.totalIncoming}</p>
                    <div className="flex items-center mt-1 text-xs text-blue-600">
                      <ArrowDownRight className="h-3 w-3 ml-1" />
                      مراسلات واردة
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Inbox className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-r-4 border-r-purple-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الصادر</p>
                    <p className="text-3xl font-bold mt-1">{stats.totalOutgoing}</p>
                    <div className="flex items-center mt-1 text-xs text-purple-600">
                      <ArrowUpRight className="h-3 w-3 ml-1" />
                      مراسلات صادرة
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Send className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-r-4 border-r-yellow-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">قيد الانتظار</p>
                    <p className="text-3xl font-bold mt-1">{stats.pendingCount}</p>
                    <div className="flex items-center mt-1 text-xs text-yellow-600">
                      <Clock className="h-3 w-3 ml-1" />
                      بانتظار المعالجة
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">عاجلة</p>
                  <p className="text-2xl font-bold text-red-600">{stats.urgentCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مؤرشفة</p>
                  <p className="text-2xl font-bold text-green-600">{stats.archivedCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">اليوم</p>
                  <p className="text-2xl font-bold">{stats.todayCount}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">توزيع الحالات</CardTitle>
              <CardDescription>الحالة الحالية للمراسلات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.statusStats.map((s) => {
                  const total = stats.totalCorrespondence || 1
                  const pct = Math.round((s.count / total) * 100)
                  return (
                    <div key={s.status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className={getStatusColor(s.status)}>
                            {getStatusLabel(s.status)}
                          </Badge>
                        </span>
                        <span className="text-muted-foreground">{s.count} ({pct}%)</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">توزيع الأولويات</CardTitle>
              <CardDescription>أولوية المراسلات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.priorityStats.map((p) => {
                  const total = stats.totalCorrespondence || 1
                  const pct = Math.round((p.count / total) * 100)
                  return (
                    <div key={p.priority} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className={getPriorityColor(p.priority)}>
                            {getPriorityLabel(p.priority)}
                          </Badge>
                        </span>
                        <span className="text-muted-foreground">{p.count} ({pct}%)</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">توزيع حسب النوع</CardTitle>
            <CardDescription>التصنيفات المختلفة للمراسلات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats.categoryStats.map((c) => (
                <div key={c.category} className="text-center p-3 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer" onClick={() => {
                  setFilterCategory(c.category)
                  setCurrentPage('search')
                }}>
                  <div className="flex justify-center mb-2 text-muted-foreground">
                    {getCategoryIcon(c.category)}
                  </div>
                  <p className="text-2xl font-bold">{c.count}</p>
                  <p className="text-xs text-muted-foreground">{getCategoryLabel(c.category)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Correspondence */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">آخر المراسلات</CardTitle>
                <CardDescription>أحدث المراسلات المسجلة في النظام</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage('search')}>
                عرض الكل
                <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.recentCorrespondence.map((corr) => (
                <div
                  key={corr.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => viewCorrespondence(corr.id)}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${corr.type === 'incoming' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                    {corr.type === 'incoming' ? <Inbox className="h-5 w-5 text-blue-600" /> : <Send className="h-5 w-5 text-purple-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{corr.subject}</span>
                      <Badge variant="outline" className={`text-xs shrink-0 ${getPriorityColor(corr.priority)}`}>
                        {getPriorityLabel(corr.priority)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {corr.referenceNumber}
                      </span>
                      <span>{formatDate(corr.createdAt)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(corr.status)}>
                    {getStatusLabel(corr.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Correspondence Table Section
  const renderCorrespondenceTable = (type: 'incoming' | 'outgoing') => {
    const filteredCorr = correspondence.filter(c => c.type === type)

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {type === 'incoming' ? <Inbox className="h-6 w-6 text-blue-600" /> : <Send className="h-6 w-6 text-purple-600" />}
              {type === 'incoming' ? 'المراسلات الواردة' : 'المراسلات الصادرة'}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {filteredCorr.length} مراسلة
            </p>
          </div>
          <Button onClick={() => openNewDialog(type)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة {type === 'incoming' ? 'وارد' : 'صادر'} جديد
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="in_review">قيد المراجعة</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  <SelectItem value="archived">مؤرشف</SelectItem>
                  <SelectItem value="returned">مرتجع</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="urgent">عاجل</SelectItem>
                  <SelectItem value="high">مرتفع</SelectItem>
                  <SelectItem value="normal">عادي</SelectItem>
                  <SelectItem value="low">منخفض</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="letter">كتاب رسمي</SelectItem>
                  <SelectItem value="memo">مذكرة</SelectItem>
                  <SelectItem value="circular">تعميم</SelectItem>
                  <SelectItem value="decision">قرار</SelectItem>
                  <SelectItem value="report">تقرير</SelectItem>
                  <SelectItem value="contract">عقد</SelectItem>
                </SelectContent>
              </Select>
              {(filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setFilterStatus('all')
                  setFilterPriority('all')
                  setFilterCategory('all')
                }}>
                  <X className="h-4 w-4 ml-1" />
                  إزالة الفلاتر
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم المرجع</TableHead>
                    <TableHead className="text-right">الموضوع</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">{type === 'incoming' ? 'المرسل' : 'المرسل إليه'}</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الأولوية</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCorr.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Inbox className="h-12 w-12" />
                          <p>لا توجد مراسلات</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCorr.map((corr) => (
                      <TableRow key={corr.id} className="cursor-pointer hover:bg-accent/50" onClick={() => viewCorrespondence(corr.id)}>
                        <TableCell className="font-mono text-sm">{corr.referenceNumber}</TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">{corr.subject}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            {getCategoryIcon(corr.category)}
                            {getCategoryLabel(corr.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{type === 'incoming' ? corr.senderName : corr.recipientName}</TableCell>
                        <TableCell className="text-sm">{formatDate(type === 'incoming' ? corr.dateReceived : corr.dateSent)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPriorityColor(corr.priority)}>
                            {getPriorityLabel(corr.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(corr.status)}>
                            {getStatusLabel(corr.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewCorrespondence(corr.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {corr.status !== 'archived' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStatusChange(corr.id, 'archived')}>
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Search Section
  const renderSearch = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6" />
          البحث المتقدم
        </h2>
        <p className="text-muted-foreground text-sm mt-1">ابحث في جميع المراسلات الواردة والصادرة</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالرقم المرجعي، الموضوع، اسم المرسل..."
                className="pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchCorrespondence() }}
              />
            </div>
            <Button onClick={() => fetchCorrespondence()}>
              <Search className="h-4 w-4 ml-2" />
              بحث
            </Button>
          </div>

          {/* Advanced Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); fetchCorrespondence() }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="in_review">قيد المراجعة</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="archived">مؤرشف</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); fetchCorrespondence() }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                <SelectItem value="urgent">عاجل</SelectItem>
                <SelectItem value="high">مرتفع</SelectItem>
                <SelectItem value="normal">عادي</SelectItem>
                <SelectItem value="low">منخفض</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); fetchCorrespondence() }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="التصنيف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="letter">كتاب رسمي</SelectItem>
                <SelectItem value="memo">مذكرة</SelectItem>
                <SelectItem value="circular">تعميم</SelectItem>
                <SelectItem value="decision">قرار</SelectItem>
                <SelectItem value="report">تقرير</SelectItem>
                <SelectItem value="contract">عقد</SelectItem>
              </SelectContent>
            </Select>
            {(filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all' || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={() => {
                setFilterStatus('all')
                setFilterPriority('all')
                setFilterCategory('all')
                setSearchQuery('')
                fetchCorrespondence()
              }}>
                <X className="h-4 w-4 ml-1" />
                إزالة الكل
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">رقم المرجع</TableHead>
                  <TableHead className="text-right">الموضوع</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">المرسل</TableHead>
                  <TableHead className="text-right">المستلم</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الأولوية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {correspondence.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Search className="h-12 w-12" />
                        <p>لا توجد نتائج</p>
                        <p className="text-sm">جرب تعديل معايير البحث</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  correspondence.map((corr) => (
                    <TableRow key={corr.id} className="cursor-pointer hover:bg-accent/50" onClick={() => viewCorrespondence(corr.id)}>
                      <TableCell>
                        <Badge variant="secondary" className={corr.type === 'incoming' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                          {corr.type === 'incoming' ? 'وارد' : 'صادر'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{corr.referenceNumber}</TableCell>
                      <TableCell className="max-w-[180px] truncate font-medium">{corr.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 text-xs">
                          {getCategoryIcon(corr.category)}
                          {getCategoryLabel(corr.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{corr.senderName || '-'}</TableCell>
                      <TableCell className="text-sm">{corr.recipientName || '-'}</TableCell>
                      <TableCell className="text-sm">{formatDate(corr.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(corr.priority)}>
                          {getPriorityLabel(corr.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(corr.status)}>
                          {getStatusLabel(corr.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); viewCorrespondence(corr.id) }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Reports Section
  const renderReports = () => {
    if (!stats) return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            التقارير والإحصائيات
          </h2>
          <p className="text-muted-foreground text-sm mt-1">إحصائيات شاملة عن المراسلات</p>
        </div>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>الاتجاه الشهري</CardTitle>
            <CardDescription>عدد المراسلات الواردة والصادرة شهرياً</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.monthlyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد بيانات كافية</p>
            ) : (
              <div className="space-y-4">
                {stats.monthlyData.map((m) => {
                  const max = Math.max(m.incoming + m.outgoing, 1)
                  return (
                    <div key={m.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{m.month}</span>
                        <span className="text-muted-foreground">{m.incoming + m.outgoing} مراسلة</span>
                      </div>
                      <div className="flex gap-1 h-8">
                        <div
                          className="bg-blue-500 rounded-r-sm flex items-center justify-center text-white text-xs font-medium min-w-[2rem]"
                          style={{ width: `${(m.incoming / max) * 100}%` }}
                        >
                          {m.incoming}
                        </div>
                        <div
                          className="bg-purple-500 rounded-l-sm flex items-center justify-center text-white text-xs font-medium min-w-[2rem]"
                          style={{ width: `${(m.outgoing / max) * 100}%` }}
                        >
                          {m.outgoing}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center gap-4 pt-2 border-t text-sm">
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-blue-500" />
                    الوارد
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-purple-500" />
                    الصادر
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع التصنيفات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.categoryStats.map((c) => {
                  const total = stats.totalCorrespondence || 1
                  const pct = Math.round((c.count / total) * 100)
                  const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
                  const idx = stats.categoryStats.indexOf(c)
                  return (
                    <div key={c.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          {getCategoryIcon(c.category)}
                          {getCategoryLabel(c.category)}
                        </span>
                        <span className="text-muted-foreground">{c.count} ({pct}%)</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${colors[idx % colors.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Confidentiality Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع السرية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {(['public', 'internal', 'confidential', 'secret'] as const).map((conf) => {
                  const count = correspondence.filter(c => c.confidentiality === conf).length
                  return (
                    <div key={conf} className="p-4 rounded-lg border text-center hover:shadow-sm transition-shadow">
                      <div className="flex justify-center mb-2 text-muted-foreground">
                        {getConfidentialityIcon(conf)}
                      </div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{getConfidentialityLabel(conf)}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>ملخص إحصائي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="text-3xl font-bold">{stats.totalCorrespondence}</p>
                <p className="text-sm text-muted-foreground">إجمالي المراسلات</p>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="text-3xl font-bold">{stats.totalIncoming}</p>
                <p className="text-sm text-muted-foreground">الوارد</p>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="text-3xl font-bold">{stats.totalOutgoing}</p>
                <p className="text-sm text-muted-foreground">الصادر</p>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="text-3xl font-bold">{stats.archivedCount}</p>
                <p className="text-sm text-muted-foreground">مؤرشف</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Departments Section
  const renderDepartments = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            إدارة الأقسام
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{departments.length} قسم</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <Card key={dept.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">{dept.code}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {dept.description && (
                <p className="text-sm text-muted-foreground">{dept.description}</p>
              )}
              <Separator />
              <div className="space-y-1.5 text-sm">
                {dept.manager && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserCircle className="h-4 w-4" />
                    <span>{dept.manager}</span>
                  </div>
                )}
                {dept.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{dept.phone}</span>
                  </div>
                )}
                {dept.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{dept.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  // Users Section
  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            إدارة المستخدمين
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{users.length} مستخدم</p>
        </div>
        {authUser?.role === 'admin' && (
          <Button className="gap-2" onClick={() => setShowAddUserDialog(true)}>
            <Plus className="h-4 w-4" />
            إضافة مستخدم
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">البريد الإلكتروني</TableHead>
                  <TableHead className="text-right">الصلاحية</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                          {user.name.charAt(0)}
                        </div>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'}>
                        {user.role === 'admin' ? 'مدير النظام' : user.role === 'manager' ? 'مشرف' : 'مستخدم'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'destructive'} className={user.isActive ? 'bg-green-100 text-green-800' : ''}>
                        {user.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              إضافة مستخدم جديد
            </DialogTitle>
            <DialogDescription>أدخل بيانات المستخدم الجديد</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input
                placeholder="أحمد محمد"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني *</Label>
              <Input
                type="email"
                placeholder="ahmed@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور *</Label>
              <Input
                type="password"
                placeholder="6 أحرف على الأقل"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>الصلاحية</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">مستخدم</SelectItem>
                  <SelectItem value="manager">مشرف</SelectItem>
                  <SelectItem value="admin">مدير النظام</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>القسم (اختياري)</Label>
              <Input
                placeholder="أدخل اسم القسم"
                value={newUserDept}
                onChange={(e) => setNewUserDept(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleAddUser}
                disabled={!newUserName || !newUserEmail || !newUserPassword || addUserSubmitting}
              >
                {addUserSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Plus className="h-4 w-4 ml-1" />
                )}
                إنشاء المستخدم
              </Button>
              <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  // View Correspondence Dialog
  const renderViewDialog = () => {
    if (!selectedCorrespondence) return null

    return (
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedCorrespondence.type === 'incoming' ? <Inbox className="h-5 w-5 text-blue-600" /> : <Send className="h-5 w-5 text-purple-600" />}
              تفاصيل المراسلة
            </DialogTitle>
            <DialogDescription>
              رقم المرجع: {selectedCorrespondence.referenceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Subject & Status */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{selectedCorrespondence.subject}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="gap-1">
                    {getCategoryIcon(selectedCorrespondence.category)}
                    {getCategoryLabel(selectedCorrespondence.category)}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(selectedCorrespondence.priority)}>
                    {getPriorityLabel(selectedCorrespondence.priority)}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(selectedCorrespondence.status)}>
                    {getStatusLabel(selectedCorrespondence.status)}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {getConfidentialityIcon(selectedCorrespondence.confidentiality)}
                    {getConfidentialityLabel(selectedCorrespondence.confidentiality)}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">المرسل</Label>
                  <p className="font-medium">{selectedCorrespondence.senderName || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">قسم المرسل</Label>
                  <p className="font-medium">{selectedCorrespondence.senderDept || '-'}</p>
                </div>
                {selectedCorrespondence.dateReceived && (
                  <div>
                    <Label className="text-muted-foreground">تاريخ الوارد</Label>
                    <p className="font-medium">{formatDate(selectedCorrespondence.dateReceived)}</p>
                  </div>
                )}
                {selectedCorrespondence.dateSent && (
                  <div>
                    <Label className="text-muted-foreground">تاريخ الصادر</Label>
                    <p className="font-medium">{formatDate(selectedCorrespondence.dateSent)}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">المستلم</Label>
                  <p className="font-medium">{selectedCorrespondence.recipientName || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">قسم المستلم</Label>
                  <p className="font-medium">{selectedCorrespondence.recipientDept || '-'}</p>
                </div>
                {selectedCorrespondence.dueDate && (
                  <div>
                    <Label className="text-muted-foreground">تاريخ الاستحقاق</Label>
                    <p className="font-medium">{formatDate(selectedCorrespondence.dueDate)}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">تاريخ الإنشاء</Label>
                  <p className="font-medium">{formatDate(selectedCorrespondence.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedCorrespondence.description && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">الوصف</Label>
                  <p className="mt-1 text-sm leading-relaxed bg-muted p-3 rounded-lg">{selectedCorrespondence.description}</p>
                </div>
              </>
            )}

            {/* Tags */}
            {selectedCorrespondence.tags && (
              <div>
                <Label className="text-muted-foreground">الوسوم</Label>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {selectedCorrespondence.tags.split(',').map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {selectedCorrespondence.attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">المرفقات ({selectedCorrespondence.attachments.length})</Label>
                  <div className="space-y-2 mt-2">
                    {selectedCorrespondence.attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-2 p-2 rounded border text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{att.fileName}</span>
                        <span className="text-muted-foreground text-xs">{(att.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Activity Log */}
            {selectedCorrespondence.logs.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">سجل النشاط</Label>
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                    {selectedCorrespondence.logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-2 rounded border text-sm">
                        <div className="mt-0.5">
                          {log.action === 'created' && <Plus className="h-4 w-4 text-green-500" />}
                          {log.action === 'archived' && <Archive className="h-4 w-4 text-gray-500" />}
                          {log.action === 'status_change' && <RefreshCw className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{log.notes}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{formatDate(log.createdAt)}</span>
                            {log.fromStatus && (
                              <span>
                                {getStatusLabel(log.fromStatus)} ← {getStatusLabel(log.toStatus || '')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedCorrespondence.status === 'pending' && (
                <Button size="sm" onClick={() => handleStatusChange(selectedCorrespondence.id, 'in_review')}>
                  <FileClock className="h-4 w-4 ml-1" />
                  بدء المراجعة
                </Button>
              )}
              {(selectedCorrespondence.status === 'pending' || selectedCorrespondence.status === 'in_review') && (
                <>
                  <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(selectedCorrespondence.id, 'approved')}>
                    <CheckCircle2 className="h-4 w-4 ml-1" />
                    اعتماد
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleStatusChange(selectedCorrespondence.id, 'rejected')}>
                    <XCircle className="h-4 w-4 ml-1" />
                    رفض
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(selectedCorrespondence.id, 'returned')}>
                    <RefreshCw className="h-4 w-4 ml-1" />
                    إرجاع
                  </Button>
                </>
              )}
              {selectedCorrespondence.status !== 'archived' && (
                <Button size="sm" variant="secondary" onClick={() => handleStatusChange(selectedCorrespondence.id, 'archived')}>
                  <Archive className="h-4 w-4 ml-1" />
                  أرشفة
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive mr-auto" onClick={() => handleDelete(selectedCorrespondence.id)}>
                <Trash2 className="h-4 w-4 ml-1" />
                حذف
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // New Correspondence Dialog
  const renderNewDialog = () => (
    <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            إضافة مراسلة {newCorrType === 'incoming' ? 'واردة' : 'صادرة'} جديدة
          </DialogTitle>
          <DialogDescription>أدخل بيانات المراسلة الجديدة</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>رقم المرجع *</Label>
              <Input
                placeholder="مثال: IN-2026-007"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">كتاب رسمي</SelectItem>
                  <SelectItem value="memo">مذكرة</SelectItem>
                  <SelectItem value="circular">تعميم</SelectItem>
                  <SelectItem value="decision">قرار</SelectItem>
                  <SelectItem value="report">تقرير</SelectItem>
                  <SelectItem value="contract">عقد</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>الموضوع *</Label>
            <Input
              placeholder="موضوع المراسلة"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الأولوية</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">عاجل</SelectItem>
                  <SelectItem value="high">مرتفع</SelectItem>
                  <SelectItem value="normal">عادي</SelectItem>
                  <SelectItem value="low">منخفض</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>السرية</Label>
              <Select value={formData.confidentiality} onValueChange={(v) => setFormData({ ...formData, confidentiality: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">عام</SelectItem>
                  <SelectItem value="internal">داخلي</SelectItem>
                  <SelectItem value="confidential">سري</SelectItem>
                  <SelectItem value="secret">سري للغاية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم المرسل</Label>
              <Input
                placeholder="اسم المرسل"
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>قسم المرسل</Label>
              <Input
                placeholder="أدخل اسم القسم"
                value={formData.senderDept}
                onChange={(e) => setFormData({ ...formData, senderDept: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم المستلم</Label>
              <Input
                placeholder="اسم المستلم"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>قسم المستلم</Label>
              <Input
                placeholder="أدخل اسم القسم"
                value={formData.recipientDept}
                onChange={(e) => setFormData({ ...formData, recipientDept: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {newCorrType === 'incoming' ? (
              <div className="space-y-2">
                <Label>تاريخ الوارد</Label>
                <Input
                  type="date"
                  value={formData.dateReceived}
                  onChange={(e) => setFormData({ ...formData, dateReceived: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>تاريخ الصادر</Label>
                <Input
                  type="date"
                  value={formData.dateSent}
                  onChange={(e) => setFormData({ ...formData, dateSent: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>تاريخ الاستحقاق</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>الوصف / الملاحظات</Label>
            <Textarea
              placeholder="أدخل وصف المراسلة أو ملاحظات إضافية"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>الوسوم (مفصولة بفواصل)</Label>
            <Input
              placeholder="مثال: ميزانية، اعتماد، سنوي"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleCreate} disabled={!formData.referenceNumber || !formData.subject}>
              <Plus className="h-4 w-4 ml-1" />
              إنشاء المراسلة
            </Button>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  // ============= MAIN RENDER =============

  // Auth Loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">جاري التحقق...</p>
        </div>
      </div>
    )
  }

  // Admin Setup Screen
  if (adminSetupMode && !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-background to-orange-50 p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <Card className="shadow-2xl border-amber-200">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Shield className="h-10 w-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl text-amber-800">
                إعداد حساب المسؤول
              </CardTitle>
              <CardDescription className="text-amber-700">
                هذه هي الخطوة الأولى لتفعيل نظام الأرشفة
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Warning/info message */}
              <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">إعداد أولي - يحدث مرة واحدة فقط</p>
                  <p className="text-amber-700">هذا الحساب سيكون له صلاحيات كاملة لإدارة النظام والمستخدمين. بعد إنشاء حساب المسؤول، لن يظهر هذا الإعداد مرة أخرى.</p>
                </div>
              </div>

              {authError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {authError}
                </div>
              )}

              <form onSubmit={handleAdminSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل *</Label>
                  <div className="relative">
                    <UserCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="أحمد محمد"
                      className="pr-10"
                      value={setupName}
                      onChange={(e) => setSetupName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني *</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      className="pr-10"
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور *</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="6 أحرف على الأقل"
                      className="pr-10"
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>القسم (اختياري)</Label>
                  <Input
                    placeholder="أدخل اسم القسم"
                    value={setupDept}
                    onChange={(e) => setSetupDept(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-l from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white" disabled={authSubmitting}>
                  {authSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <Shield className="h-4 w-4 ml-2" />
                  )}
                  إنشاء حساب المسؤول
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Login Screen
  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                  <Archive className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
              <CardDescription>
                أدخل بيانات حسابك للوصول إلى نظام الأرشفة
              </CardDescription>
            </CardHeader>
            <CardContent>
              {authError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="ahmed@example.com"
                      className="pr-10"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••"
                      className="pr-10"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={authSubmitting}>
                  {authSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <LogOut className="h-4 w-4 ml-2 rotate-180" />
                  )}
                  تسجيل الدخول
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  لتسجيل حساب جديد، تواصل مع مسؤول النظام
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Main App (Authenticated)
  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-card border-l transition-all duration-300 flex flex-col shrink-0`}>
        {/* Logo & User Info */}
        <div className="border-b">
          <div className="h-16 flex items-center justify-between px-4">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Archive className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-sm">نظام الأرشفة</h1>
                  <p className="text-xs text-muted-foreground">المراسلات الرسمية</p>
                </div>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          {sidebarOpen && authUser && (
            <div className="px-4 pb-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {authUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{authUser.name}</p>
                <p className="text-xs text-muted-foreground">
                  {authUser.role === 'admin' ? 'مدير النظام' : authUser.role === 'manager' ? 'مشرف' : 'مستخدم'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                currentPage === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        {sidebarOpen && (
          <div className="p-4 border-t space-y-2">
            <Button variant="ghost" size="sm" className="w-full gap-2 text-destructive hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-lg">
              {navItems.find(n => n.id === currentPage)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => openNewDialog('incoming')}>
              <Inbox className="h-4 w-4" />
              وارد جديد
            </Button>
            <Button size="sm" className="gap-2" onClick={() => openNewDialog('outgoing')}>
              <Send className="h-4 w-4" />
              صادر جديد
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                {authUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-medium block leading-tight">{authUser.name}</span>
                <span className="text-xs text-muted-foreground">
                  {authUser.role === 'admin' ? 'مدير النظام' : authUser.role === 'manager' ? 'مشرف' : 'مستخدم'}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">جاري تحميل البيانات...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {currentPage === 'dashboard' && renderDashboard()}
                {currentPage === 'incoming' && renderCorrespondenceTable('incoming')}
                {currentPage === 'outgoing' && renderCorrespondenceTable('outgoing')}
                {currentPage === 'search' && renderSearch()}
                {currentPage === 'reports' && renderReports()}
                {currentPage === 'departments' && renderDepartments()}
                {currentPage === 'users' && authUser?.role === 'admin' && renderUsers()}
                {currentPage === 'users' && authUser?.role !== 'admin' && (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Shield className="h-12 w-12 mb-3" />
                    <p className="text-lg font-medium">غير مصرح</p>
                    <p className="text-sm">هذه الصفحة متاحة فقط لمدير النظام</p>
                    <Button variant="outline" className="mt-4" onClick={() => setCurrentPage('dashboard')}>العودة للوحة التحكم</Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Dialogs */}
      {renderViewDialog()}
      {renderNewDialog()}
    </div>
  )
}
