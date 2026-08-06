import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Hash, MapPin, Calendar, Shield, Camera, Trash2, Loader2, CalendarDays } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { ROLE_LABELS } from '../utils/constants';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE = 256;

const resizeImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Could not read that image'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });

const InfoTile = ({ icon: Icon, label, value, accent }) => (
  <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
    accent
      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800'
      : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-700'
  }`}>
    <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${
      accent
        ? 'bg-primary-100 dark:bg-primary-900/40'
        : 'bg-white dark:bg-gray-700 shadow-sm'
    }`}>
      <Icon className={`w-4 h-4 ${accent ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{value || '—'}</p>
    </div>
  </div>
);

const ROLE_COLORS = {
  COUNSELLOR:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  HOD:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  SUPER_ADMIN: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800',
};

const Profile = () => {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > MAX_FILE_BYTES) { toast.error('Image must be smaller than 5MB'); return; }
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file);
      const res = await authAPI.updateAvatar(dataUrl);
      setUser(res.data.data);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await authAPI.removeAvatar();
      setUser(res.data.data);
      toast.success('Profile photo removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove photo');
    } finally { setRemoving(false); }
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Profile</h1>

      {/* Profile hero card */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Gradient banner */}
        <div className="h-28 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        {/* Avatar + info */}
        <div className="bg-white dark:bg-gray-800 px-6 pb-6">
          {/* Avatar overlaps banner */}
          <div className="relative -mt-10 mb-3 w-fit">
            <div className="w-20 h-20 rounded-2xl ring-4 ring-white dark:ring-gray-800 bg-primary-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-lg">
              {user?.avatar
                ? <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
                : initial}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-60 transition-colors"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Identity + actions row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{user?.name}</h2>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${ROLE_COLORS[user?.role] || ROLE_COLORS.COUNSELLOR}`}>
                  <Shield className="w-3 h-3" />{ROLE_LABELS[user?.role]}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 disabled:opacity-60 transition-colors border border-primary-100 dark:border-primary-800"
              >
                <Camera className="w-3.5 h-3.5" />
                {uploading ? 'Uploading…' : user?.avatar ? 'Change photo' : 'Upload photo'}
              </button>
              {user?.avatar && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removing}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-60 transition-colors border border-red-100 dark:border-red-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {removing ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account details grid */}
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Account Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoTile icon={User}        label="Full Name"         value={user?.name}              accent />
          <InfoTile icon={Mail}        label="Email Address"     value={user?.email}             accent />
          <InfoTile icon={Hash}        label="Employee ID"       value={user?.employeeId} />
          <InfoTile icon={Shield}      label="Role"              value={ROLE_LABELS[user?.role]} />
          <InfoTile icon={MapPin}      label="Department"        value={user?.departmentId?.name} />
          <InfoTile icon={Calendar}    label="Joining Date"      value={formatDate(user?.joiningDate)} />
          <InfoTile icon={CalendarDays}label="Account Created"   value={formatDate(user?.createdAt)} />
        </div>
      </div>
    </div>
  );
};

export default Profile;
