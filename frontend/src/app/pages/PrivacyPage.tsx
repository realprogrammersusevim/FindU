import { useState } from 'react';
import { Shield, Lock, Radio, Plus, Trash2, Clock, Eye, EyeOff, Calendar, MapPin, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../store/AppContext';
import type { DayOfWeek, PrivacyMode, ScheduleSlot } from '../types';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function ScheduleBar({ slots }: { slots: ScheduleSlot[] }) {
  // Create a 24-hour visual timeline
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getModeAtHour = (hour: number): PrivacyMode => {
    for (const slot of slots) {
      if (!slot.isActive) continue;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      const startH = sh + sm / 60;
      const endH = eh + em / 60;
      if (endH < startH) {
        // overnight
        if (hour >= startH || hour < endH) return slot.mode;
      } else {
        if (hour >= startH && hour < endH) return slot.mode;
      }
    }
    return 'private';
  };

  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs font-semibold text-gray-500 mb-2">Today's Schedule (24h)</p>
      <div className="flex rounded-lg overflow-hidden h-6">
        {hours.map((h) => {
          const mode = getModeAtHour(h);
          return (
            <div
              key={h}
              className={`flex-1 ${mode === 'sharing' ? 'bg-green-400' : 'bg-gray-300'}`}
              title={`${h}:00 — ${mode}`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[9px] text-gray-400">12am</span>
        <span className="text-[9px] text-gray-400">6am</span>
        <span className="text-[9px] text-gray-400">12pm</span>
        <span className="text-[9px] text-gray-400">6pm</span>
        <span className="text-[9px] text-gray-400">12am</span>
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-400" />
          <span className="text-[10px] text-gray-500">Sharing</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-300" />
          <span className="text-[10px] text-gray-500">Private</span>
        </div>
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  onRemove,
  onToggle,
}: {
  slot: ScheduleSlot;
  onRemove: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border p-4 transition-all ${
        slot.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${slot.mode === 'sharing' ? 'bg-green-500' : 'bg-amber-400'}`}
            />
            <span className="text-sm font-semibold text-gray-800">{slot.label}</span>
            {slot.isDefault && (
              <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold uppercase">
                Default
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              {slot.startTime} – {slot.endTime}
            </span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                slot.mode === 'sharing'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {slot.mode === 'sharing' ? 'Sharing' : 'Private'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              slot.isActive ? 'bg-indigo-500' : 'bg-gray-200'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                slot.isActive ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
          {!slot.isDefault && (
            <button onClick={onRemove} className="p-1 text-gray-300 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Days */}
      <div className="flex gap-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center ${
              slot.days.includes(d) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {d[0]}
          </div>
        ))}
      </div>
    </div>
  );
}

function AddSlotModal({ onAdd, onClose }: { onAdd: (slot: Omit<ScheduleSlot, 'id'>) => void; onClose: () => void }) {
  const [label, setLabel] = useState('New Schedule');
  const [days, setDays] = useState<DayOfWeek[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [mode, setMode] = useState<PrivacyMode>('sharing');

  const toggleDay = (d: DayOfWeek) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleSubmit = () => {
    if (!label.trim() || days.length === 0) return;
    onAdd({ label, days, startTime, endTime, mode, isDefault: false, isActive: true } as Omit<ScheduleSlot, 'id'> & { isActive: boolean });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-white rounded-t-3xl w-full max-w-[430px] p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add Schedule Slot</h3>
          <button onClick={onClose} className="text-gray-400 text-lg">×</button>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none"
            placeholder="e.g. Study hours"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-2">Mode</label>
          <div className="flex gap-2">
            {(['sharing', 'private'] as PrivacyMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === m
                    ? m === 'sharing'
                      ? 'bg-green-500 text-white'
                      : 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {m === 'sharing' ? <Radio className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {m === 'sharing' ? 'Sharing' : 'Private'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-2">Active Days</label>
          <div className="flex gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`flex-1 h-9 rounded-xl text-xs font-bold transition-colors ${
                  days.includes(d) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {d[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600 block mb-1">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600 block mb-1">End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-2xl hover:bg-indigo-700 transition-colors"
        >
          Add Schedule
        </button>
      </motion.div>
    </motion.div>
  );
}

function AddExceptionModal({ onAdd, onClose }: { onAdd: (exc: { date: string; startTime: string; endTime: string; mode: PrivacyMode; note: string }) => void; onClose: () => void }) {
  const [date, setDate] = useState('2026-03-01');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('23:59');
  const [mode, setMode] = useState<PrivacyMode>('sharing');
  const [note, setNote] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-white rounded-t-3xl w-full max-w-[430px] p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add Exception</h3>
          <button onClick={onClose} className="text-gray-400 text-lg">×</button>
        </div>
        <p className="text-xs text-gray-500">Override your default schedule for a specific day and time window — great for events or late nights.</p>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-2">Override Mode</label>
          <div className="flex gap-2">
            {(['sharing', 'private'] as PrivacyMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  mode === m
                    ? m === 'sharing'
                      ? 'bg-green-500 text-white'
                      : 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {m === 'sharing' ? <Radio className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600 block mb-1">Start</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600 block mb-1">End</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Late event night"
            className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none"
          />
        </div>

        <button
          onClick={() => { onAdd({ date, startTime, endTime, mode, note }); onClose(); }}
          className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-2xl"
        >
          Add Exception
        </button>
      </motion.div>
    </motion.div>
  );
}

export function PrivacyPage() {
  const {
    currentUser,
    geofences,
    setPrivacyMode,
    setLocationMode,
    addScheduleSlot,
    removeScheduleSlot,
    updateScheduleSlot,
    addException,
    removeException,
  } = useApp();

  const [showAddSlot, setShowAddSlot] = useState(false);
  const [showAddException, setShowAddException] = useState(false);
  const [activeSection, setActiveSection] = useState<'schedule' | 'exceptions' | 'precision' | 'zones'>('schedule');

  const isSharing = currentUser.currentMode === 'sharing';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">Privacy</h1>
        </div>

        {/* Current Mode Toggle */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Current Status</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPrivacyMode('sharing')}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
                isSharing
                  ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              <Radio className="w-5 h-5" />
              <span className="text-xs font-semibold">Sharing</span>
              <span className={`text-[10px] ${isSharing ? 'text-green-100' : 'text-gray-400'}`}>
                Friends can see you
              </span>
            </button>
            <button
              onClick={() => setPrivacyMode('private')}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
                !isSharing
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              <Lock className="w-5 h-5" />
              <span className="text-xs font-semibold">Private</span>
              <span className={`text-[10px] ${!isSharing ? 'text-amber-100' : 'text-gray-400'}`}>
                Location hidden
              </span>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            This overrides your schedule. Your schedule will resume at the next scheduled time.
          </p>
        </div>
      </div>

      {/* Section nav */}
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: 'schedule', label: 'Schedule', icon: Clock },
            { id: 'exceptions', label: 'Exceptions', icon: Calendar },
            { id: 'precision', label: 'Precision', icon: Eye },
            { id: 'zones', label: 'Zones', icon: MapPin },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id as typeof activeSection)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeSection === s.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Schedule section */}
        {activeSection === 'schedule' && (
          <>
            <ScheduleBar slots={currentUser.scheduleSlots.filter((s) => s.isActive)} />

            <div className="space-y-2">
              {currentUser.scheduleSlots.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  onRemove={() => removeScheduleSlot(slot.id)}
                  onToggle={() => updateScheduleSlot(slot.id, { isActive: !slot.isActive })}
                />
              ))}
            </div>

            <button
              onClick={() => setShowAddSlot(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Schedule Slot
            </button>

            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex gap-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-800">How schedules work</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Schedules run automatically every day. Private slots override sharing ones. You can always manually override using the toggle above.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Exceptions section */}
        {activeSection === 'exceptions' && (
          <>
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
              <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Exceptions override your default schedule for a specific date and time window — great for events or late nights.
              </p>
            </div>

            {currentUser.exceptions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm text-gray-500">No exceptions set</p>
                <p className="text-xs text-gray-400 mt-1">Add one-off overrides for specific dates</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentUser.exceptions.map((exc) => (
                  <div key={exc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${exc.mode === 'sharing' ? 'bg-green-500' : 'bg-amber-400'}`}
                          />
                          <span className="text-sm font-semibold text-gray-800">
                            {new Date(exc.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              exc.mode === 'sharing' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {exc.mode}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {exc.startTime} – {exc.endTime}
                        </p>
                        {exc.note && <p className="text-xs text-gray-400 mt-0.5 italic">"{exc.note}"</p>}
                      </div>
                      <button
                        onClick={() => removeException(exc.id)}
                        className="p-1 text-gray-300 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAddException(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Exception
            </button>
          </>
        )}

        {/* Precision section */}
        {activeSection === 'precision' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Location Precision</h3>
              <p className="text-xs text-gray-500 mb-4">
                Choose how your location appears to friends and groups.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => setLocationMode('exact')}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    currentUser.locationMode === 'exact'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      currentUser.locationMode === 'exact' ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}
                  >
                    <Eye
                      className={`w-4 h-4 ${currentUser.locationMode === 'exact' ? 'text-indigo-600' : 'text-gray-400'}`}
                    />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${currentUser.locationMode === 'exact' ? 'text-indigo-700' : 'text-gray-700'}`}>
                      Exact Location
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Friends see your precise pin on the map. Best for meetups and coordination.
                    </p>
                  </div>
                  {currentUser.locationMode === 'exact' && (
                    <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setLocationMode('binary')}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    currentUser.locationMode === 'binary'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      currentUser.locationMode === 'binary' ? 'bg-purple-100' : 'bg-gray-100'
                    }`}
                  >
                    <EyeOff
                      className={`w-4 h-4 ${currentUser.locationMode === 'binary' ? 'text-purple-600' : 'text-gray-400'}`}
                    />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${currentUser.locationMode === 'binary' ? 'text-purple-700' : 'text-gray-700'}`}>
                      Zone Only (Binary)
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Friends only see whether you're inside or outside a geofence — not your exact position.
                    </p>
                  </div>
                  {currentUser.locationMode === 'binary' && (
                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">Current Setting</p>
              <div className="flex items-center gap-2">
                {currentUser.locationMode === 'exact' ? (
                  <Eye className="w-4 h-4 text-indigo-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-purple-600" />
                )}
                <span className="text-sm text-gray-700 font-medium">
                  {currentUser.locationMode === 'exact' ? 'Sharing exact coordinates' : 'Binary zone mode active'}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Zones section */}
        {activeSection === 'zones' && (
          <>
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
              <p className="text-xs font-semibold text-indigo-800 mb-1">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />
                Geofenced Sharing
              </p>
              <p className="text-xs text-indigo-600">
                Your location is only shared when you are inside an active geofence. Outside all zones, you appear as "Not sharing."
              </p>
            </div>

            <div className="space-y-2">
              {geofences.map((fence) => {
                const isActive = currentUser.activeGeofenceIds.includes(fence.id);
                return (
                  <div
                    key={fence.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${fence.color}20` }}
                    >
                      {fence.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{fence.name}</p>
                      <p className="text-xs text-gray-500">{fence.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Radius: {fence.radius}m</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-xs font-medium text-gray-500">
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors">
              <Plus className="w-4 h-4" />
              Create New Geofence
            </button>
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddSlot && (
          <AddSlotModal
            onAdd={(slot) => addScheduleSlot(slot as Parameters<typeof addScheduleSlot>[0])}
            onClose={() => setShowAddSlot(false)}
          />
        )}
        {showAddException && (
          <AddExceptionModal
            onAdd={addException}
            onClose={() => setShowAddException(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}