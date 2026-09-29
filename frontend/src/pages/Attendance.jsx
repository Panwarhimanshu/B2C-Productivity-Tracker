import { useState, useEffect, useMemo } from 'react';
import { Clock, UserX, Search } from 'lucide-react';
import { attendanceAPI } from '../api/attendance';
import { useAuth } from '../context/AuthContext';
import { HOD_LIKE_ROLES } from '../utils/constants';
import { getErrorMessage } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const now = new Date();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const todayISO = now.toISOString().slice(0, 10);

// Zoho's own Status values aren't a fixed set (Present/Absent plus whatever leave/holiday/shift
// types the org has configured) — style the common ones, fall back to a neutral badge for
// anything else so an unrecognized status still renders sensibly.
const STATUS_STYLE = {
  Present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Weekend: 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400',
  Holiday: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Leave: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'No Data': 'bg-gray-100 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500',
};
const FALLBACK_STYLE = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
const styleFor = (status) => STATUS_STYLE[status] || FALLBACK_STYLE;

const summarize = (rows) => rows.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, {});

const DailyTable = ({ rows }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
    <table className="w-full text-xs">
      <thead className="bg-gray-50 dark:bg-gray-700/50">
        <tr>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Date</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">First In</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Last Out</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Working Hours</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
        {rows.map((r) => (
          <tr key={r.date}>
            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.date}</td>
            <td className="px-3 py-2">
              <span className={`badge ${styleFor(r.status)}`}>{r.status}</span>
            </td>
            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.firstIn || '—'}</td>
            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.lastOut || '—'}</td>
            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.workingHours}</td>
          </tr>
        ))}
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
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Employee</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Department</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">First In</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Last Out</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Working Hours</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
        {entries.map(({ member, row }) => (
          <tr key={member._id}>
            <td className="px-3 py-2 text-gray-800 dark:text-gray-200 font-medium">{member.name}</td>
            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{member.department || '—'}</td>
            <td className="px-3 py-2">
              {row ? (
                <span className={`badge ${styleFor(row.status)}`}>{row.status}</span>
              ) : (
                <span className="text-gray-400">Not found in Zoho People</span>
              )}
            </td>
            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row?.firstIn || '—'}</td>
            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row?.lastOut || '—'}</td>
            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row?.workingHours || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SummaryTiles = ({ rows }) => {
  const s = summarize(rows);
  const statuses = Object.keys(s).sort((a, b) => (a === 'Present' ? -1 : b === 'Present' ? 1 : 0));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mb-4">
      {statuses.map((k) => (
        <div key={k} className="card p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">{k}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{s[k]}</p>
        </div>
      ))}
    </div>
  );
};

const TeamSummaryBadges = ({ rows }) => {
  const s = summarize(rows);
  const statuses = Object.keys(s).sort((a, b) => (a === 'Present' ? -1 : b === 'Present' ? 1 : 0));
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
      {statuses.map((k) => (
        <span key={k} className={`badge ${styleFor(k)}`}>{s[k]} {k}</span>
      ))}
    </div>
  );
};

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
          {isTeamView && (
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
              {['monthly', 'daily'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    viewMode === mode
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}
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
        <div className="relative max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by employee name…"
            className="input-field pl-9 text-sm"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
          />
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
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.employeeId} {m.department ? `· ${m.department}` : ''}</p>
                    </div>
                    {memberLinked ? (
                      <TeamSummaryBadges rows={rows} />
                    ) : (
                      <span className="text-xs text-gray-400">Not found in Zoho People</span>
                    )}
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
