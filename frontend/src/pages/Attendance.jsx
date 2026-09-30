import { useState, useEffect, useMemo } from 'react';
import {
  Clock, UserX, Search, ChevronDown, CalendarDays, CalendarRange,
  CheckCircle2, XCircle, CalendarOff, Umbrella, HelpCircle,
} from 'lucide-react';
import { attendanceAPI } from '../api/attendance';
import { useAuth } from '../context/AuthContext';
import { HOD_LIKE_ROLES } from '../utils/constants';
import { classNames, getErrorMessage } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const now = new Date();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const todayISO = now.toISOString().slice(0, 10);

// Zoho's own Status values aren't a fixed set (Present/Absent plus whatever leave/holiday/shift
// types the org has configured) — style + icon the common ones, fall back to a neutral badge
// for anything else so an unrecognized status still renders sensibly.
const STATUS_META = {
  Present: { icon: CheckCircle2, badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', tile: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  Absent: { icon: XCircle, badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', tile: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  Weekend: { icon: CalendarOff, badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400', tile: 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400' },
  Holiday: { icon: CalendarOff, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', tile: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  Leave: { icon: Umbrella, badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', tile: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  'No Data': { icon: HelpCircle, badge: 'bg-gray-100 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500', tile: 'bg-gray-100 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500' },
};
const FALLBACK_META = { icon: HelpCircle, badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', tile: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' };
const metaFor = (status) => STATUS_META[status] || FALLBACK_META;

const summarize = (rows) => rows.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, {});

const sortStatuses = (keys) => keys.sort((a, b) => (a === 'Present' ? -1 : b === 'Present' ? 1 : a.localeCompare(b)));

const weekdayOf = (dateStr) => WEEKDAYS[new Date(`${dateStr}T00:00:00`).getDay()];
const isWeekendDate = (dateStr) => [0, 6].includes(new Date(`${dateStr}T00:00:00`).getDay());

const Avatar = ({ name }) => (
  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
    {name?.charAt(0)?.toUpperCase() || '?'}
  </div>
);

const StatusBadge = ({ status }) => {
  const { icon: Icon, badge } = metaFor(status);
  return (
    <span className={`badge gap-1 ${badge}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
};

const DailyTable = ({ rows }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
    <table className="w-full text-xs">
      <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
        <tr>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Date</th>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">First In</th>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Last Out</th>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Working Hours</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
        {rows.map((r) => {
          const isToday = r.date === todayISO;
          return (
            <tr
              key={r.date}
              className={classNames(
                isWeekendDate(r.date) ? 'bg-gray-50/60 dark:bg-gray-900/20' : '',
                isToday ? 'ring-1 ring-inset ring-primary-300 dark:ring-primary-700 bg-primary-50/50 dark:bg-primary-900/10' : ''
              )}
            >
              <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                <span className={isToday ? 'font-semibold text-primary-700 dark:text-primary-400' : ''}>{r.date}</span>
                <span className="text-gray-400 ml-1.5">{weekdayOf(r.date)}</span>
                {isToday && <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 ml-1.5">Today</span>}
              </td>
              <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
              <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{r.firstIn || '—'}</td>
              <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{r.lastOut || '—'}</td>
              <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 font-medium">{r.workingHours}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// One row per employee for a single chosen date — the day-wise, employee-filterable view.
const DayWiseTable = ({ entries }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
    <table className="w-full text-xs">
      <thead className="bg-gray-50 dark:bg-gray-700/50">
        <tr>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Employee</th>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Department</th>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">First In</th>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Last Out</th>
          <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Working Hours</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
        {entries.map(({ member, row }) => (
          <tr key={member._id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
            <td className="px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar name={member.name} />
                <span className="text-gray-800 dark:text-gray-200 font-medium">{member.name}</span>
              </div>
            </td>
            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{member.department || '—'}</td>
            <td className="px-3 py-2.5">
              {row ? <StatusBadge status={row.status} /> : (
                <span className="text-gray-400 italic">Not in Zoho People</span>
              )}
            </td>
            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{row?.firstIn || '—'}</td>
            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{row?.lastOut || '—'}</td>
            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 font-medium">{row?.workingHours || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StatTile = ({ status, count }) => {
  const { icon: Icon, tile } = metaFor(status);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{status}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${tile}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const SummaryTiles = ({ rows }) => {
  const s = summarize(rows);
  const statuses = sortStatuses(Object.keys(s));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {statuses.map((k) => <StatTile key={k} status={k} count={s[k]} />)}
    </div>
  );
};

const TeamSummaryBadges = ({ rows }) => {
  const s = summarize(rows);
  const statuses = sortStatuses(Object.keys(s));
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      {statuses.map((k) => (
        <span key={k} className={`badge gap-1 ${metaFor(k).badge}`}>{s[k]} {k}</span>
      ))}
    </div>
  );
};

const ViewToggle = ({ viewMode, setViewMode }) => (
  <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm shadow-sm">
    {[
      { mode: 'monthly', label: 'Monthly', Icon: CalendarRange },
      { mode: 'daily', label: 'Daily', Icon: CalendarDays },
    ].map(({ mode, label, Icon }) => (
      <button
        key={mode}
        onClick={() => setViewMode(mode)}
        className={classNames(
          'px-3 py-1.5 flex items-center gap-1.5 font-medium transition-colors',
          viewMode === mode
            ? 'bg-primary-600 text-white'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </button>
    ))}
  </div>
);

const Attendance = () => {
  const { user } = useAuth();
  const isTeamView = HOD_LIKE_ROLES.includes(user?.role) || user?.role === 'SUPER_ADMIN';

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);

  // Individual view state
  const [myRows, setMyRows] = useState([]);
  const [linked, setLinked] = useState(true);

  // Team view state
  const [members, setMembers] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'daily'
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  useEffect(() => {
    setLoading(true);
    const fetch = isTeamView
      ? attendanceAPI.getTeam(month, year).then((res) => setMembers(res.data.data.members || []))
      : attendanceAPI.getMine(month, year).then((res) => {
          setMyRows(res.data.data.rows || []);
          setLinked(res.data.data.linked);
        });
    fetch.catch((err) => toast.error(getErrorMessage(err))).finally(() => setLoading(false));
  }, [month, year, isTeamView]);

  // Changing the picked day may land in a different month — keep the underlying monthly
  // fetch (which the day-wise view is sliced from) in sync with it.
  const handleDateChange = (value) => {
    setSelectedDate(value);
    const [y, m] = value.split('-').map(Number);
    if (y !== year) setYear(y);
    if (m !== month) setMonth(m);
  };

  const dayWiseEntries = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    return members
      .filter(({ user: m }) => !q || m.name.toLowerCase().includes(q))
      .map(({ user: m, rows, linked: memberLinked }) => ({
        member: m,
        row: memberLinked ? rows.find((r) => r.date === selectedDate) || null : null,
      }));
  }, [members, employeeSearch, selectedDate]);

  const dayWiseSummary = useMemo(() => summarize(
    dayWiseEntries.filter((e) => e.row).map((e) => e.row)
  ), [dayWiseEntries]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {isTeamView ? "Your team's attendance, synced from Zoho People." : 'Your attendance, synced from Zoho People.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {isTeamView && <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />}
          {isTeamView && viewMode === 'daily' ? (
            <input
              type="date"
              className="input-field w-auto text-sm"
              value={selectedDate}
              max={todayISO}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          ) : (
            <>
              <select className="input-field w-auto text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select className="input-field w-auto text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {isTeamView && viewMode === 'daily' && !loading && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by employee name…"
              className="input-field pl-9 text-sm"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
            />
          </div>
          {Object.keys(dayWiseSummary).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {sortStatuses(Object.keys(dayWiseSummary)).map((k) => (
                <span key={k} className={`badge gap-1 ${metaFor(k).badge}`}>{dayWiseSummary[k]} {k}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : isTeamView ? (
        members.length === 0 ? (
          <div className="card py-16 text-center">
            <UserX className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active members found for this department.</p>
          </div>
        ) : viewMode === 'daily' ? (
          dayWiseEntries.length === 0 ? (
            <div className="card py-16 text-center">
              <UserX className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No employees match "{employeeSearch}".</p>
            </div>
          ) : (
            <DayWiseTable entries={dayWiseEntries} />
          )
        ) : (
          <div className="space-y-3">
            {members.map(({ user: m, rows, linked: memberLinked }) => {
              const isOpen = expandedId === m._id;
              return (
                <div key={m._id} className="card overflow-hidden">
                  <button
                    onClick={() => memberLinked && setExpandedId(isOpen ? null : m._id)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={m.name} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{m.name}</p>
                        <p className="text-xs text-gray-400 truncate">{m.employeeId} {m.department ? `· ${m.department}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {memberLinked ? (
                        <TeamSummaryBadges rows={rows} />
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not in Zoho People</span>
                      )}
                      {memberLinked && (
                        <ChevronDown className={classNames('w-4 h-4 text-gray-400 transition-transform', isOpen ? 'rotate-180' : '')} />
                      )}
                    </div>
                  </button>
                  {isOpen && memberLinked && (
                    <div className="border-t border-gray-100 dark:border-gray-700 p-4">
                      <DailyTable rows={rows} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : !linked ? (
        <div className="card py-16 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No Zoho People record was found for your account's email.</p>
          <p className="text-xs text-gray-400 mt-1">Ask your Super Admin to check your email matches your Zoho People profile.</p>
        </div>
      ) : (
        <>
          <SummaryTiles rows={myRows} />
          <DailyTable rows={myRows} />
        </>
      )}
    </div>
  );
};

export default Attendance;
