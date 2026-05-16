import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, unlink, stat } from 'fs/promises'
import path from 'path'
import os from 'os'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const execFileAsync = promisify(execFile)

function getScriptPath() {
  return path.join(process.cwd(), 'scripts', 'scan.ps1')
}

function isWindows() {
  return os.platform() === 'win32'
}

// GET /api/scan — List available TWAIN/WIA scanners
export async function GET() {
  if (!isWindows()) {
    return NextResponse.json({
      error: 'المسح الضوئي متاح فقط على نظام Windows',
      scanners: [],
    })
  }

  try {
    const scriptPath = getScriptPath()
    const { stdout } = await execFileAsync('powershell.exe', [
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-NonInteractive',
      '-File', scriptPath,
      '-Action', 'list',
    ], { timeout: 30000 })

    const output = stdout.trim()

    if (output === 'NO_SCANNERS') {
      return NextResponse.json({ scanners: [], message: 'لا يوجد سكنر متصل' })
    }

    const scanners = output
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [indexStr, name] = line.split('|')
        return { index: parseInt(indexStr, 10), name: name || `سكنر ${indexStr}` }
      })

    return NextResponse.json({ scanners })
  } catch (error: any) {
    console.error('Scan list error:', error)
    return NextResponse.json({
      error: 'تعذر الوصول إلى السكنر. تأكد من تثبيت تعريفات TWAIN/WIA.',
      scanners: [],
    })
  }
}

// POST /api/scan — Trigger TWAIN/WIA scan
export async function POST(request: Request) {
  if (!isWindows()) {
    return NextResponse.json(
      { error: 'المسح الضوئي متاح فقط على نظام Windows' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const mode = body.mode || 'dialog'   // 'dialog' or 'scan'
    const scannerIndex = body.scannerIndex || 1
    const resolution = body.resolution || 200

    const scriptPath = getScriptPath()
    const outputPath = path.join(os.tmpdir(), `wia_scan_${Date.now()}.jpg`)

    const args = [
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-File', scriptPath,
      '-Action', mode,
      '-OutputPath', outputPath,
    ]

    if (mode === 'scan') {
      args.push('-ScannerIndex', String(scannerIndex))
      args.push('-Resolution', String(resolution))
    }

    // Scan can take up to 2 minutes
    const { stdout, stderr } = await execFileAsync('powershell.exe', args, {
      timeout: 180000,
      windowsHide: false,
    })

    const output = stdout.trim()
    console.log('Scan output:', output)
    if (stderr) console.log('Scan stderr:', stderr)

    if (output === 'CANCELLED') {
      return NextResponse.json({ cancelled: true, message: 'تم إلغاء المسح الضوئي' })
    }

    if (output.startsWith('ERROR:')) {
      const errorMsg = output.replace('ERROR:', '')
      return NextResponse.json(
        { error: `خطأ في المسح الضوئي: ${errorMsg}` },
        { status: 500 }
      )
    }

    if (!output.startsWith('OK:')) {
      return NextResponse.json(
        { error: 'حدث خطأ غير متوقع في المسح الضوئي' },
        { status: 500 }
      )
    }

    // Read the scanned image
    const filePath = output.replace('OK:', '')
    const fileExists = await stat(filePath).then(() => true).catch(() => false)

    if (!fileExists) {
      return NextResponse.json(
        { error: 'لم يتم العثور على ملف الصورة الممسوحة' },
        { status: 500 }
      )
    }

    const imageBuffer = await readFile(filePath)
    const base64 = imageBuffer.toString('base64')

    // Determine MIME type from extension
    const ext = path.extname(filePath).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.bmp': 'image/bmp',
      '.tif': 'image/tiff',
      '.tiff': 'image/tiff',
    }
    const mimeType = mimeMap[ext] || 'image/jpeg'

    // Clean up temp file
    await unlink(filePath).catch(() => {})

    return NextResponse.json({
      success: true,
      image: `data:${mimeType};base64,${base64}`,
      fileName: `scanned_${Date.now()}.${ext.replace('.', '')}`,
    })
  } catch (error: any) {
    console.error('Scan error:', error)

    // Check if it's a timeout
    if (error.killed) {
      return NextResponse.json(
        { error: 'انتهت مهلة المسح الضوئي. حاول مرة أخرى.' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'تعذر إتمام المسح الضوئي. تأكد من تثبيت تعريفات السكنر (TWAIN/WIA).' },
      { status: 500 }
    )
  }
}
