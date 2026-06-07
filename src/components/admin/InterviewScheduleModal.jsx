import React, { useEffect, useMemo, useState } from 'react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toDateInputValue(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function combineDateAndTime(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0)
}

function formatPreview(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  const dt = combineDateAndTime(dateStr, timeStr)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * @param {{
 *   open: boolean,
 *   applicantName?: string,
 *   onClose: () => void,
 *   onConfirm: (scheduledAt: string) => void | Promise<void>,
 *   confirming?: boolean,
 * }} props
 */
export default function InterviewScheduleModal({
  open,
  applicantName = '',
  onClose,
  onConfirm,
  confirming = false,
}) {
  const today = useMemo(() => startOfDay(new Date()), [open])
  const defaultDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toDateInputValue(d)
  }, [open])

  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [selectedTime, setSelectedTime] = useState('09:00')

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirming) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, confirming])

  useEffect(() => {
    if (!open) return
    setSelectedDate(defaultDate)
    setSelectedTime('09:00')
    const d = new Date(defaultDate)
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [open, defaultDate])

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const first = new Date(year, month, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []

    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, month, day))
    }
    return cells
  }, [viewMonth])

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const preview = formatPreview(selectedDate, selectedTime)

  const scheduledDateTime = useMemo(() => {
    if (!selectedDate || !selectedTime) return null
    const dt = combineDateAndTime(selectedDate, selectedTime)
    return Number.isNaN(dt.getTime()) ? null : dt
  }, [selectedDate, selectedTime])

  const isScheduleInPast = scheduledDateTime != null && scheduledDateTime.getTime() < Date.now()

  const handleConfirm = async () => {
    if (!scheduledDateTime || isScheduleInPast) return
    await onConfirm(scheduledDateTime.toISOString())
  }

  const isPastDate = (d) => startOfDay(d) < today

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-schedule-title"
      onClick={confirming ? undefined : onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#232f48] bg-[#111722] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#232f48] px-5 py-4">
          <div>
            <h2 id="interview-schedule-title" className="text-lg font-bold text-white">
              Schedule interview
            </h2>
            {applicantName ? (
              <p className="mt-1 text-xs text-[#92a4c9]">
                Select date and time for <span className="font-medium text-white">{applicantName}</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#92a4c9]">Select date and time for the interview</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="rounded-md p-2 text-[#92a4c9] transition hover:bg-[#232f48] hover:text-white disabled:pointer-events-none disabled:opacity-40"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              disabled={confirming}
              className="rounded-md p-2 text-[#92a4c9] transition hover:bg-[#232f48] hover:text-white disabled:opacity-40"
              aria-label="Previous month"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <p className="text-sm font-bold uppercase tracking-wide text-white">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              disabled={confirming}
              className="rounded-md p-2 text-[#92a4c9] transition hover:bg-[#232f48] hover:text-white disabled:opacity-40"
              aria-label="Next month"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="aspect-square" />
              }
              const dateStr = toDateInputValue(day)
              const selected = selectedDate === dateStr
              const past = isPastDate(day)
              const isToday = sameDay(day, today)

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={past || confirming}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-lg text-sm font-medium transition ${
                    selected
                      ? 'bg-primary text-white shadow-sm'
                      : past
                        ? 'cursor-not-allowed text-[#475569] opacity-40'
                        : 'text-white hover:bg-[#232f48]'
                  } ${isToday && !selected ? 'ring-1 ring-primary/50' : ''}`}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>

          <label className="mb-4 block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[#92a4c9]">
              Time
            </span>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              disabled={confirming}
              className="w-full rounded-lg border border-[#232f48] bg-[#0d121c] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
          </label>

          {preview && (
            <div
              className={`mb-4 rounded-lg border px-3 py-2.5 ${
                isScheduleInPast
                  ? 'border-orange-800/40 bg-orange-950/30'
                  : 'border-blue-800/40 bg-blue-950/30'
              }`}
            >
              <p
                className={`text-[10px] font-bold uppercase ${
                  isScheduleInPast ? 'text-orange-200' : 'text-blue-200'
                }`}
              >
                {isScheduleInPast ? 'Invalid time' : 'Scheduled for'}
              </p>
              <p className="mt-1 text-sm text-white">
                {isScheduleInPast ? 'Please choose a future date and time.' : preview}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-[#232f48] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="flex-1 rounded-lg border border-[#324467] px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-[#92a4c9] transition hover:bg-[#232f48] hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || !scheduledDateTime || isScheduleInPast}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#1151d3] disabled:pointer-events-none disabled:opacity-40"
          >
            {confirming ? 'Sending…' : 'Confirm & notify'}
          </button>
        </div>
      </div>
    </div>
  )
}
