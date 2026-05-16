import { useMemo, useState } from 'react'
import axios from 'axios'

const getImageUrl = (file) => {
  if (!file) return ''
  if (typeof file === 'string') return file
  return URL.createObjectURL(file)
}

const normalizeReceiverSearchText = (value = '') =>
  String(value || '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FF0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isReceiverAccepted = (value = '') => {
  const raw = String(value || '')
  const normalized = normalizeReceiverSearchText(raw)

  const directPatterns = [
    /مصفى\s*النفط\s*الذهبي/,
    /مصفاة\s*النفط\s*الذهبي/,
    /مصفي\s*النفط\s*الذهبي/,
    /مصفاه\s*النفط\s*الذهبي/,
  ]

  if (directPatterns.some((pattern) => pattern.test(raw))) {
    return true
  }

  const normalizedPatterns = [
    /مصفي\s*النفط\s*الذهبي/,
    /مصفاه\s*النفط\s*الذهبي/,
  ]

  return normalizedPatterns.some((pattern) => pattern.test(normalized))
}

const emptyForm = {
  documentNumber: '',
  documentType: '',
  loadingWarehouseId: '',
  loadingWarehouseName: '',
  receiverEntity: '',
  receiverEntityWarning: '',
  vehicleId: '',
  vehicleNumber: '',
  driverId: '',
  driverName: '',
  suppliedQuantityLiters: '',
  issueDate: '',
  rawText: '',
  warnings: [],
  validations: {},
}

export default function UnloadingRegistration() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState(emptyForm)
  const [apiError, setApiError] = useState('')
  const [apiSuccess, setApiSuccess] = useState('')
  const [receipt, setReceipt] = useState(null)

  const token = localStorage.getItem('token')
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImage(file)
    setPreview(getImageUrl(file))
    setApiError('')
    setApiSuccess('')
    setReceipt(null)
    setForm(emptyForm)
  }

  const handleExtract = async () => {
    if (!image) {
      setApiError('يرجى اختيار صورة المستند أولاً')
      return
    }

    setExtracting(true)
    setApiError('')
    setApiSuccess('')
    setReceipt(null)

    try {
      const fd = new FormData()
      fd.append('image', image)

      const { data } = await axios.post('/api/unloading-records/extract', fd, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      })

      if (!data?.success || !data?.data) {
        setApiError(data?.message || 'تعذر استخراج البيانات')
        return
      }

      const extracted = data.data

      setForm({
        documentNumber: extracted.documentNumber || '',
        documentType: extracted.documentType || '',
        loadingWarehouseId: extracted.loadingWarehouseId || '',
        loadingWarehouseName: extracted.loadingWarehouseName || '',
        receiverEntity: extracted.receiverEntity || '',
        receiverEntityWarning: extracted.receiverEntityWarning || '',
        vehicleId: extracted.vehicleId || '',
        vehicleNumber: extracted.vehicleNumber || '',
        driverId: extracted.driverId || '',
        driverName: extracted.driverName || '',
        suppliedQuantityLiters: extracted.suppliedQuantityLiters || '',
        issueDate: extracted.issueDate || '',
        rawText: extracted.rawText || '',
        warnings: extracted.warnings || [],
        validations: extracted.validations || {},
      })

      setApiSuccess(data?.message || 'تمت قراءة المستند. راجع البيانات قبل الحفظ.')
    } catch (err) {
      setApiError(err.response?.data?.message || 'فشل في قراءة المستند')
    } finally {
      setExtracting(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      }

      if (name === 'receiverEntity') {
        const isValid = isReceiverAccepted(value)
        next.receiverEntityWarning = !isValid && value ? 'الجهة المرسل إليها غير صحيحة' : ''
        next.validations = {
          ...prev.validations,
          receiverEntityValid: isValid,
        }
      }

      return next
    })
  }

  const validateBeforeSave = () => {
    if (!form.documentNumber) return 'رقم المستند مطلوب'
    if (!/^[A-Z]\d{8}$/.test(form.documentNumber)) {
      return 'رقم المستند يجب أن يكون حرفاً إنكليزياً يليه 8 أرقام'
    }

    if (!form.documentType) return 'نوع المستند مطلوب'
    if (!form.loadingWarehouseId) return 'الجهة المجهزة غير مطابقة لقاعدة البيانات'
    if (!form.receiverEntity) return 'الجهة المرسل إليها مطلوبة'
    if (!form.vehicleId) return 'المركبة غير مطابقة لقاعدة البيانات'
    if (!form.driverId) return 'السائق غير مطابق لقاعدة البيانات'
    if (!form.suppliedQuantityLiters || Number(form.suppliedQuantityLiters) <= 0) {
      return 'الكمية المجهزة غير صالحة'
    }
    if (!form.issueDate) return 'تاريخ الإصدار مطلوب'

    if (!form.validations?.documentNumberValid) return 'رقم المستند غير صالح'
    if (!form.validations?.documentNumberUnique) return 'رقم المستند موجود مسبقاً'
    if (!form.validations?.receiverEntityValid) return 'المستند غير موجه إلى مصفاة النفط الذهبي'
    if (!form.validations?.loadingWarehouseFound) return 'الجهة المجهزة غير موجودة في قاعدة البيانات'
    if (!form.validations?.vehicleFound) return 'رقم المركبة غير موجود في قاعدة البيانات'
    if (!form.validations?.driverFound) return 'اسم السائق غير موجود في قاعدة البيانات'
    if (!form.validations?.vehicleDriverMatches) return 'السائق لا يطابق السائق المرتبط بالمركبة'

    return ''
  }

  const handleSave = async () => {
    const error = validateBeforeSave()
    if (error) {
      setApiError(error)
      return
    }

    setSaving(true)
    setApiError('')
    setApiSuccess('')

    try {
      const payload = {
        documentNumber: form.documentNumber,
        documentType: form.documentType,
        loadingWarehouseId: form.loadingWarehouseId,
        receiverEntity: form.receiverEntity,
        vehicleId: form.vehicleId,
        driverId: form.driverId,
        suppliedQuantityLiters: Number(form.suppliedQuantityLiters),
        issueDate: form.issueDate,
        rawText: form.rawText,
        warnings: form.warnings,
      }

      const { data } = await axios.post('/api/unloading-records/save', payload, { headers })

      if (!data?.success) {
        setApiError(data?.message || 'فشل في الحفظ')
        return
      }

      setReceipt(data.data?.receipt || null)
      setApiSuccess(data?.message || 'تم الحفظ بنجاح')
    } catch (err) {
      setApiError(err.response?.data?.message || 'فشل في الحفظ')
    } finally {
      setSaving(false)
    }
  }

    const printReceipt = () => {
    // فتح نافذة طباعة تحتوي على الوصل فقط
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      // إذا لم تعمل النافذة المنبثقة (مانع الإعلانات)، استخدم الطباعة العادية
      window.print()
      return
    }
    
    // الحصول على محتوى الوصل
    const receiptEl = document.querySelector('.receipt-6cm')
    if (!receiptEl) {
      window.print()
      return
    }

    const receiptHTML = receiptEl.outerHTML
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>وصل تسجيل التفريغ</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Tajawal', sans-serif;
            direction: rtl;
            width: 6cm;
            margin: 0 auto;
            padding: 5mm;
            background: #fff;
          }
          ${receiptHTML}
          @media print {
            body { margin: 0; padding: 2mm; }
          }
        </style>
      </head>
      <body onload="window.print(); window.close()">
        ${receiptHTML}
        <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 10px;">
          تمت الطباعة من النظام - ${new Date().toLocaleDateString('ar-IQ')}
        </p>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const validationRows = [
    ['رقم المستند', form.validations?.documentNumberValid],
    ['عدم تكرار رقم المستند', form.validations?.documentNumberUnique],
    ['الجهة المجهزة موجودة', form.validations?.loadingWarehouseFound],
    ['الجهة المرسل إليها صحيحة', form.validations?.receiverEntityValid],
    ['رقم المركبة موجود', form.validations?.vehicleFound],
    ['اسم السائق موجود', form.validations?.driverFound],
    ['السائق يطابق المركبة', form.validations?.vehicleDriverMatches],
  ]

  return (
    <div className="pricing-page">
      <div className="pricing-hero">
        <div>
          <div className="pricing-kicker">🧾 تسجيل التفريغ</div>
          <h1 className="pricing-title">تسجيل التفريغ</h1>
          <p className="pricing-subtitle">
            ارفع صورة المستند ليتم استخراج البيانات المطلوبة تلقائياً، ثم راجعها قبل الحفظ.
          </p>
        </div>
      </div>

      {(apiError || apiSuccess) && (
        <div className={`pricing-alert ${apiError ? 'pricing-alert-error' : 'pricing-alert-success'}`}>
          {apiError || apiSuccess}
        </div>
      )}

      <div className="pricing-card">
        <div className="pricing-card-header">
          <div>
            <h2 className="pricing-card-title">رفع المستند</h2>
          </div>
        </div>

        <div className="pricing-toolbar">
          <label className="pricing-btn pricing-btn-secondary" style={{ cursor: 'pointer' }}>
            إضافة صورة المستند
            <input type="file" accept="image/*" onChange={handleImageChange} hidden />
          </label>

          <button
            type="button"
            className="pricing-btn pricing-btn-primary"
            onClick={handleExtract}
            disabled={!image || extracting}
          >
            {extracting ? 'جاري القراءة...' : 'قراءة البيانات'}
          </button>

          {receipt && (
            <button
              type="button"
              className="pricing-btn no-print"
              onClick={printReceipt}
              style={{
                background: '#1e40af',
                color: '#fff',
                padding: '10px 24px',
                fontSize: 15,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(30,64,175,0.3)',
              }}
            >
              🖨️ طباعة الوصل
            </button>
          )}
        </div>

        {preview && (
          <div style={{ marginTop: 18 }}>
            <img
              src={preview}
              alt="preview"
              style={{
                width: '100%',
                maxHeight: 500,
                objectFit: 'contain',
                borderRadius: 18,
                border: '1px solid #e5e7eb',
                background: '#fff',
              }}
            />
          </div>
        )}
      </div>

      <div className="pricing-card">
        <div className="pricing-card-header">
          <div>
            <h2 className="pricing-card-title">البيانات المستخرجة</h2>
          </div>
        </div>

        <div className="pricing-form">
          <div className="pricing-grid-3">
            <div className="pricing-field">
              <label className="pricing-label">رقم المستند</label>
              <input
                className="pricing-input"
                name="documentNumber"
                value={form.documentNumber}
                onChange={handleChange}
                placeholder="A28187153"
              />
            </div>

            <div className="pricing-field">
              <label className="pricing-label">نوع المستند</label>
              <input
                className="pricing-input"
                name="documentType"
                value={form.documentType}
                onChange={handleChange}
              />
            </div>

            <div className="pricing-field">
              <label className="pricing-label">تاريخ الإصدار</label>
              <input
                type="date"
                className="pricing-input"
                name="issueDate"
                value={form.issueDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="pricing-field">
            <label className="pricing-label">الجهة المجهزة / مستودع التحميل</label>
            <input
              className="pricing-input"
              name="loadingWarehouseName"
              value={form.loadingWarehouseName}
              onChange={handleChange}
            />
          </div>

          <div className="pricing-field">
            <label className="pricing-label">الجهة المرسل إليها</label>
            <input
              className="pricing-input"
              name="receiverEntity"
              value={form.receiverEntity}
              onChange={handleChange}
            />
          </div>

          {form.receiverEntity ? (
            <div
              className={`pricing-alert ${
                form.validations?.receiverEntityValid ? 'pricing-alert-success' : 'pricing-alert-error'
              }`}
              style={{ marginBottom: 18 }}
            >
              الجهة المقروءة من الصورة: <strong>{form.receiverEntity}</strong>
              {!form.validations?.receiverEntityValid && (
                <span> — الحالة: غير صالح</span>
              )}
            </div>
          ) : null}

          {form.receiverEntityWarning ? (
            <div className="pricing-alert pricing-alert-error" style={{ marginBottom: 18 }}>
              <strong>تحذير:</strong> {form.receiverEntityWarning}
            </div>
          ) : null}

          <div className="pricing-grid-3">
            <div className="pricing-field">
              <label className="pricing-label">رقم المركبة</label>
              <input
                className="pricing-input"
                name="vehicleNumber"
                value={form.vehicleNumber}
                onChange={handleChange}
              />
            </div>

            <div className="pricing-field">
              <label className="pricing-label">اسم السائق</label>
              <input
                className="pricing-input"
                name="driverName"
                value={form.driverName}
                onChange={handleChange}
              />
            </div>

            <div className="pricing-field">
              <label className="pricing-label">الكمية المجهزة (لتر)</label>
              <input
                className="pricing-input"
                name="suppliedQuantityLiters"
                value={form.suppliedQuantityLiters}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="pricing-modal-footer no-print">
            <button
              type="button"
              className="pricing-btn pricing-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ البيانات'}
            </button>
          </div>
        </div>
      </div>

      <div className="pricing-card">
        <div className="pricing-card-header">
          <div>
            <h2 className="pricing-card-title">نتائج التحقق</h2>
          </div>
        </div>

        <div className="pricing-table-wrap">
          <table className="pricing-table">
            <thead>
              <tr>
                <th>البند</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {validationRows.map(([label, ok]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>
                    {ok ? (
                      <span className="pricing-badge pricing-badge-liter">سليم</span>
                    ) : (
                      <span className="pricing-badge pricing-badge-fixed">غير صالح</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {Array.isArray(form.warnings) && form.warnings.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div className="pricing-alert pricing-alert-error">
              <strong>تحذيرات:</strong>
              <ul style={{ marginTop: 8, paddingRight: 18 }}>
                {form.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>

      {receipt && (
        <div className="receipt-6cm">
          <div className="receipt-title">وصل تسجيل التفريغ</div>

          <div className="receipt-row"><strong>رقم المستند:</strong> {receipt.documentNumber}</div>
          <div className="receipt-row"><strong>نوع المستند:</strong> {receipt.documentType}</div>
          <div className="receipt-row"><strong>الجهة المجهزة:</strong> {receipt.loadingWarehouse}</div>
          <div className="receipt-row"><strong>الجهة المرسل إليها:</strong> {receipt.receiverEntity}</div>
          <div className="receipt-row"><strong>رقم المركبة:</strong> {receipt.vehicleNumber}</div>
          <div className="receipt-row"><strong>اسم السائق:</strong> {receipt.driverName}</div>
          <div className="receipt-row"><strong>الكمية:</strong> {receipt.suppliedQuantityLiters} لتر</div>
          <div className="receipt-row"><strong>تاريخ الإصدار:</strong> {String(receipt.issueDate).slice(0, 10)}</div>

          <div className="receipt-row">
            <strong>نوع التسعير:</strong> {receipt.pricingType === 'liter' ? 'حسب اللتر' : 'سعر ثابت'}
          </div>

          {receipt.pricingType === 'liter' && (
            <div className="receipt-row">
              <strong>سعر اللتر:</strong> {receipt.priceValue || 0} د.ع
            </div>
          )}

          <div className="receipt-row">
            <strong>مبلغ النقلة:</strong> {receipt.tripAmount || 0} د.ع
          </div>

          {Number(receipt.advanceAmount || 0) > 0 ? (
            <div className="receipt-row">
              <strong>مبلغ السلفة:</strong> {receipt.advanceAmount} د.ع
            </div>
          ) : (
            <div className="receipt-row">
              <strong>المبلغ الكلي للنقلة:</strong> {receipt.tripAmount || 0} د.ع
            </div>
          )}

          <div className="receipt-row">
            <strong>المبلغ الظاهر في الوصل:</strong> {receipt.payableAmount || 0} د.ع
          </div>

          {receipt.qrCodeDataUrl && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <img src={receipt.qrCodeDataUrl} alt="QR" style={{ width: 120, height: 120 }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}