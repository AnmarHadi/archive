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

// Find PowerShell executable with full path
function getPowerShellPath(): string {
  if (!isWindows()) return 'powershell'
  const sysRoot = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows'
  return path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
}

// GET /api/scan — List available TWAIN/WIA scanners
export async function GET() {
  if (!isWindows()) {
    return NextResponse.json({
      error: 'المسح الضوئي متاح فقط على نظام Windows',
      scanners: [],
      platform: os.platform(),
    })
  }

  try {
    const scriptPath = getScriptPath()
    const psPath = getPowerShellPath()

    // Check if script exists
    try {
      await stat(scriptPath)
    } catch {
      return NextResponse.json({
        error: 'ملف script المسح الضوئي غير موجود في: ' + scriptPath,
        scanners: [],
      })
    }

    // Check if PowerShell exists
    try {
      await stat(psPath)
    } catch {
      return NextResponse.json({
        error: 'PowerShell غير موجود في: ' + psPath,
        scanners: [],
      })
    }

    const { stdout, stderr } = await execFileAsync(psPath, [
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-NonInteractive',
      '-File', scriptPath,
      '-Action', 'list',
    ], { timeout: 30000 })

    if (stderr) {
      console.log('Scan list stderr:', stderr)
    }

    const output = stdout.trim()

    if (output === 'NO_SCANNERS' || output === '') {
      return NextResponse.json({
        scanners: [],
        message: 'لا يوجد سكنر متصل. تأكد من تشغيل السكنر وتوصيله بالحاسبة.',
      })
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
    const msg = error?.message || ''
    let userMsg = 'تعذر الوصول إلى السكنر. تأكد من تثبيت تعريفات TWAIN/WIA.'

    if (msg.includes('ENOENT')) {
      userMsg = 'تعذر تشغيل PowerShell. تأكد من أنك تعمل على نظام Windows.'
    } else if (msg.includes('EPERM') || msg.includes('EACCES')) {
      userMsg = 'ليس لديك صلاحية تشغيل المسح الضوئي. حاول تشغيل المتصفح كمسؤول.'
    }

    return NextResponse.json({
      error: userMsg,
      scanners: [],
      debug: process.env.NODE_ENV === 'development' ? msg : undefined,
    })
  }
}

// POST /api/scan — Trigger TWAIN/WIA silent scan (no external dialog)
export async function POST(request: Request) {
  if (!isWindows()) {
    return NextResponse.json(
      { error: 'المسح الضوئي متاح فقط على نظام Windows' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const scannerIndex = body.scannerIndex || 1
    const resolution = body.resolution || 200
    const colorMode = body.colorMode || 1  // 1=Color, 2=Grayscale, 4=B&W

    const scriptPath = getScriptPath()
    const psPath = getPowerShellPath()

    // Check if script exists
    try {
      await stat(scriptPath)
    } catch {
      return NextResponse.json(
        { error: 'ملف script المسح الضوئي غير موجود في: ' + scriptPath },
        { status: 500 }
      )
    }

    // Check if PowerShell exists
    try {
      await stat(psPath)
    } catch {
      return NextResponse.json(
        { error: 'PowerShell غير موجود في: ' + psPath },
        { status: 500 }
      )
    }

    const outputPath = path.join(os.tmpdir(), `wia_scan_${Date.now()}.jpg`)

    // Always use 'scan' action (silent mode - no external dialog)
    const args = [
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-NonInteractive',
      '-File', scriptPath,
      '-Action', 'scan',
      '-OutputPath', outputPath,
      '-ScannerIndex', String(scannerIndex),
      '-Resolution', String(resolution),
      '-ColorMode', String(colorMode),
    ]

    console.log('Scan command:', psPath, args.join(' '))

    // Scan can take up to 3 minutes
    const { stdout, stderr } = await execFileAsync(psPath, args, {
      timeout: 180000,
      windowsHide: true,
      env: { ...process.env },
    })

    const output = stdout.trim()
    console.log('Scan output:', output)
    if (stderr) console.log('Scan stderr:', stderr.trim())

    if (output.startsWith('ERROR:')) {
      const errorMsg = output.replace('ERROR:', '')
      return NextResponse.json(
        { error: `خطأ في المسح الضوئي: ${errorMsg}` },
        { status: 500 }
      )
    }

    if (!output.startsWith('OK:')) {
      return NextResponse.json(
        { error: 'حدث خطأ غير متوقع في المسح الضوئي. الخرج: ' + output.substring(0, 200) },
        { status: 500 }
      )
    }

    // Read the scanned image
    const filePath = output.replace('OK:', '')
    const fileExists = await stat(filePath).then(() => true).catch(() => false)

    if (!fileExists) {
      return NextResponse.json(
        { error: 'لم يتم العثور على ملف الصورة الممسوحة في: ' + filePath },
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

    const msg = error?.message || ''

    // Check if it's a timeout
    if (error.killed) {
      return NextResponse.json(
        { error: 'انتهت مهلة المسح الضوئي (3 دقائق). حاول مرة أخرى أو تأكد من أن السكنر يعمل.' },
        { status: 408 }
      )
    }

    let userMsg = 'تعذر إتمام المسح الضوئي. تأكد من تثبيت تعريفات السكنر (TWAIN/WIA).'

    if (msg.includes('ENOENT')) {
      userMsg = 'تعذر تشغيل PowerShell. تأكد من أنك تعمل على نظام Windows.'
    } else if (msg.includes('EPERM') || msg.includes('EACCES')) {
      userMsg = 'ليس لديك صلاحية تشغيل المسح الضوئي. حاول تشغيل المتصفح كمسؤول.'
    }

    return NextResponse.json(
      {
        error: userMsg,
        debug: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 }
    )
  }
}
