import { useState, useEffect } from 'react';
import { Clock, UserX } from 'lucide-react';
import { attendanceAPI } from '../api/attendance';
import { useAuth } from '../context/AuthContext';
import { HOD_LIKE_ROLES } from '../utils/constants';
import { getErrorMessage } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const now = new Date();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_STYLE = {
  Present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Late: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Absent: 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400',
};

const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');

const summarize = (rows) => rows.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, { Present: 0, Late: 0, Absent: 0 });

const DailyTable = ({ rows }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
    <table className="w-full text-xs">
      <thead className="bg-gray-50 dark:bg-gray-700/50">
        <tr>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Date</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">First In</th>
          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Last Out</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
        {rows.map((r) => (
          <tr key={r.date}>
            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.date}</td>
            <td className="px-3 py-2">
              <span className={`badge ${STATUS_STYLE[r.status]}`}>{r.status}</span>
            </td>
            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{timeOf(r.firstIn)}</td>
            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{timeOf(r.lastOut)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SummaryTiles = ({ rows }) => {
  const s = summarize(rows);
  return (
    <div className="grid grid-cols-3 gap-3 max-w-sm mb-4">
      {['Present', 'Late', 'Absent'].map((k) => (
        <div key={k} className="card p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">{k}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{s[k]}</p>
        </div>
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {isTeamView ? "Your team's attendance, synced from the Matrix punch machine." : 'Your attendance, synced from the Matrix punch machine.'}
          </p>
        </div>
        <div className="flex gap-2">
          <select className="input-field w-auto text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input-field w-auto text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : isTeamView ? (
        members.length === 0 ? (
          <div className="card py-16 text-center">
            <UserX className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No team members are linked to the attendance device yet.</p>
            <p className="text-xs text-gray-400 mt-1">Set each person's Matrix User ID in User Management to bring their attendance in.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map(({ user: m, rows }) => {
              const s = summarize(rows);
              const isOpen = expandedId === m._id;
              return (
                <div key={m._id} className="card overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : m._id)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.employeeId} {m.department ? `· ${m.department}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`badge ${STATUS_STYLE.Present}`}>{s.Present} Present</span>
                      <span className={`badge ${STATUS_STYLE.Late}`}>{s.Late} Late</span>
                      <span className={`badge ${STATUS_STYLE.Absent}`}>{s.Absent} Absent</span>
                    </div>
                  </button>
                  {isOpen && (
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
          <p className="text-gray-500">Your account isn't linked to the attendance device yet.</p>
          <p className="text-xs text-gray-400 mt-1">Ask your Super Admin to set your Matrix User ID in User Management.</p>
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
