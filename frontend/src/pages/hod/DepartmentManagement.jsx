import { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Building2, Users, ChevronRight, ChevronDown,
  UserCog, Mail, Phone, Briefcase, X, Camera,
} from 'lucide-react';
import { departmentsAPI } from '../../api/departments';
import { usersAPI } from '../../api/users';
import { departmentMembersAPI } from '../../api/departmentMembers';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const emptyForm = { name: '', description: '' };

const AVATAR_SIZE = 256;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

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

const emptyMemberForm = (departmentId) => ({
  departmentId, team: '', name: '', designation: '', phone: '', email: '', whatToContactFor: '', order: 0, visible: true,
});

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// Colored section palette — HOD and Counsellors get fixed colors, sub-teams cycle through the rest.
const HOD_COLOR = { chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', avatar: 'from-blue-500 to-blue-700', dot: 'bg-blue-500' };
const COUNSELLOR_COLOR = { chip: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300', avatar: 'from-primary-500 to-primary-700', dot: 'bg-primary-500' };
const TEAM_PALETTE = [
  { chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', avatar: 'from-amber-500 to-orange-600', dot: 'bg-amber-500' },
  { chip: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', avatar: 'from-teal-500 to-cyan-600', dot: 'bg-teal-500' },
  { chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', avatar: 'from-violet-500 to-purple-600', dot: 'bg-violet-500' },
  { chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', avatar: 'from-rose-500 to-pink-600', dot: 'bg-rose-500' },
  { chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', avatar: 'from-indigo-500 to-blue-600', dot: 'bg-indigo-500' },
  { chip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300', avatar: 'from-cyan-500 to-teal-600', dot: 'bg-cyan-500' },
];

// A single labeled group of people (HOD / Counsellors / a sub-team) rendered as a card grid.
const PersonSection = ({ icon: Icon, color, title, people, emptyText, onAdd, onEditPerson, onDeletePerson }) => (
  <div>
    <div className="flex items-center justify-between mb-2.5">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color.chip}`}>
        <Icon className="w-3.5 h-3.5" />{title} ({people.length})
      </span>
      {onAdd && (
        <button onClick={onAdd} className="text-xs font-medium text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />Add
        </button>
      )}
    </div>
    {people.length === 0 ? (
      <p className="text-xs text-gray-400 pl-1">{emptyText}</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {people.map((p) => (
          <div key={p._id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-start gap-2.5">
            <div className={`w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br ${color.avatar} flex items-center justify-center text-white text-xs font-bold`}>
              {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : initials(p.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{p.name}</p>
                {p.hidden && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 flex-shrink-0">Hidden</span>}
              </div>
              {p.designation && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.designation}</p>}
              <div className="mt-1 space-y-0.5">
                {p.phone && (
                  <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
                    <Phone className="w-3 h-3 flex-shrink-0" /><span className="truncate">{p.phone}</span>
                  </a>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
                    <Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{p.email}</span>
                  </a>
                )}
              </div>
              {p.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 line-clamp-2">{p.description}</p>}
            </div>
            {(onEditPerson || onDeletePerson) && (
              <div className="flex flex-col gap-1 flex-shrink-0">
                {onEditPerson && (
                  <button onClick={() => onEditPerson(p)} className="p-1 rounded text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDeletePerson && (
                  <button onClick={() => onDeletePerson(p)} className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

const DepartmentManagement = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isHOD = user?.role === 'HOD';
  const canEditMembers = isSuperAdmin || isHOD;

  const [departments, setDepartments] = useState([]);
  const [hods, setHods] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedHodIds, setSelectedHodIds] = useState([]);
  const [selectedCounsellorIds, setSelectedCounsellorIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Member (directory tree entry) modal state
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm, setMemberForm] = useState(emptyMemberForm(null));
  const [memberPhotoData, setMemberPhotoData] = useState(undefined);
  const [memberPhotoPreview, setMemberPhotoPreview] = useState('');
  const [savingMember, setSavingMember] = useState(false);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, hodRes, counsellorRes, memberRes] = await Promise.all([
        departmentsAPI.getAll(),
        usersAPI.getAll({ role: 'HOD', limit: 500 }),
        usersAPI.getAll({ role: 'COUNSELLOR', limit: 500 }),
        departmentMembersAPI.getAll(),
      ]);
      setDepartments(deptRes.data.data);
      setHods(hodRes.data.data);
      setCounsellors(counsellorRes.data.data);
      setMembers(memberRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // HOD/Counsellor only ever see & manage their own department.
  const visibleDepartments = isSuperAdmin
    ? departments
    : departments.filter((d) => d._id === user?.departmentId);

  const membersOf = (deptId) => ({
    hods: hods.filter((h) => h.departmentId?._id === deptId),
    counsellors: counsellors.filter((c) => c.departmentId?._id === deptId),
  });

  const teamGroupsOf = (deptId) => {
    const deptMembers = members.filter((m) => (m.departmentId?._id || m.departmentId) === deptId);
    const teamNames = [...new Set(deptMembers.map((m) => m.team?.trim() || 'General'))];
    return teamNames.map((team, idx) => ({
      team,
      color: TEAM_PALETTE[idx % TEAM_PALETTE.length],
      items: deptMembers
        .filter((m) => (m.team?.trim() || 'General') === team)
        .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name)),
    }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedHodIds([]);
    setSelectedCounsellorIds([]);
    setEditingDept(null);
    setShowForm(true);
  };

  const openEdit = (dept) => {
    setForm({ name: dept.name, description: dept.description || '' });
    const { hods: deptHods, counsellors: deptCounsellors } = membersOf(dept._id);
    setSelectedHodIds(deptHods.map((h) => h._id));
    setSelectedCounsellorIds(deptCounsellors.map((c) => c._id));
    setEditingDept(dept);
    setShowForm(true);
  };

  const toggleId = (list, setList, id) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let deptId = editingDept?._id;
      if (editingDept) {
        await departmentsAPI.update(editingDept._id, form);
      } else {
        const res = await departmentsAPI.create(form);
        deptId = res.data.data._id;
      }

      const { hods: prevHods, counsellors: prevCounsellors } = editingDept
        ? membersOf(editingDept._id)
        : { hods: [], counsellors: [] };
      const prevHodIds = prevHods.map((h) => h._id);
      const prevCounsellorIds = prevCounsellors.map((c) => c._id);

      const additions = [
        ...selectedHodIds.filter((id) => !prevHodIds.includes(id)),
        ...selectedCounsellorIds.filter((id) => !prevCounsellorIds.includes(id)),
      ];
      const removals = [
        ...prevHodIds.filter((id) => !selectedHodIds.includes(id)),
        ...prevCounsellorIds.filter((id) => !selectedCounsellorIds.includes(id)),
      ];

      await Promise.all([
        ...additions.map((id) => usersAPI.updateDepartment(id, deptId)),
        ...removals.map((id) => usersAPI.updateDepartment(id, null)),
      ]);

      toast.success(editingDept ? 'Department updated' : 'Department created');
      setShowForm(false);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"? Members mapped to it will become unassigned.`)) return;
    try {
      await departmentsAPI.delete(dept._id);
      toast.success('Department deleted');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // ── Directory tree member handlers ──
  const openAddMember = (deptId, team = '') => {
    setMemberForm({ ...emptyMemberForm(deptId), team });
    setEditingMember(null);
    setMemberPhotoData(undefined);
    setMemberPhotoPreview('');
    setShowMemberForm(true);
  };

  const openEditMember = (member) => {
    setMemberForm({
      departmentId: member.departmentId?._id || member.departmentId,
      team: member.team || '',
      name: member.name,
      designation: member.designation,
      phone: member.phone || '',
      email: member.email || '',
      whatToContactFor: member.whatToContactFor || '',
      order: member.order || 0,
      visible: member.visible !== false,
    });
    setEditingMember(member);
    setMemberPhotoData(undefined);
    setMemberPhotoPreview(member.photo || '');
    setShowMemberForm(true);
  };

  const handleMemberPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > MAX_FILE_BYTES) { toast.error('Image must be smaller than 5MB'); return; }
    try {
      const dataUrl = await resizeImage(file);
      setMemberPhotoData(dataUrl);
      setMemberPhotoPreview(dataUrl);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    if (!memberForm.name.trim() || !memberForm.designation.trim()) {
      toast.error('Name and designation are required');
      return;
    }
    setSavingMember(true);
    try {
      const payload = { ...memberForm };
      if (memberPhotoData !== undefined) payload.photo = memberPhotoData;
      if (editingMember) {
        await departmentMembersAPI.update(editingMember._id, payload);
        toast.success('Member updated');
      } else {
        await departmentMembersAPI.create(payload);
        toast.success('Member added');
      }
      setShowMemberForm(false);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Remove ${member.name} from the directory?`)) return;
    try {
      await departmentMembersAPI.delete(member._id);
      toast.success('Member removed');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const pageTitle = isSuperAdmin ? 'Department Management' : 'My Department';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isSuperAdmin
              ? 'Every department\'s org chart — HOD, Counsellors, and each team\'s contact directory.'
              : 'Your department\'s org chart and contact directory.'}
          </p>
        </div>
        {isSuperAdmin && (
          <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add Department</button>
        )}
      </div>

      {loading ? <LoadingSpinner className="py-20" /> : visibleDepartments.length === 0 ? (
        <div className="card py-16 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No departments {isSuperAdmin ? 'created yet' : 'assigned to you yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDepartments.map((dept) => {
            const { hods: deptHods, counsellors: deptCounsellors } = membersOf(dept._id);
            const teamGroups = teamGroupsOf(dept._id);
            const isExpanded = expandedIds.has(dept._id) || !isSuperAdmin;

            const hodPeople = deptHods.map((h) => ({ _id: h._id, name: h.name, designation: 'Head of Department', phone: h.phone, email: h.email }));
            const counsellorPeople = deptCounsellors.map((c) => ({ _id: c._id, name: c.name, designation: 'Counsellor', phone: c.phone, email: c.email }));

            return (
              <div key={dept._id} className="card overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => isSuperAdmin && toggleExpand(dept._id)}
                  onKeyDown={(e) => { if (isSuperAdmin && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleExpand(dept._id); } }}
                  className={`w-full flex items-start justify-between gap-3 p-5 text-left transition-colors ${isSuperAdmin ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30' : ''}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {isSuperAdmin && (
                      <span className="mt-1.5 flex-shrink-0 text-gray-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                    )}
                    <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg mt-0.5 flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{dept.name}</h3>
                      {dept.description && <p className="text-xs text-gray-500 mt-0.5">{dept.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">Created {formatDate(dept.createdAt)}</p>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(dept)} className="p-1.5 rounded text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(dept)} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/20 px-5 py-5 space-y-5">
                    <PersonSection
                      icon={UserCog}
                      color={HOD_COLOR}
                      title="HOD"
                      people={hodPeople}
                      emptyText="No HOD assigned"
                    />

                    <PersonSection
                      icon={Users}
                      color={COUNSELLOR_COLOR}
                      title="Counsellors"
                      people={counsellorPeople}
                      emptyText="No Counsellors assigned"
                    />

                    {teamGroups.map(({ team, color, items }) => (
                      <PersonSection
                        key={team}
                        icon={Briefcase}
                        color={color}
                        title={team}
                        people={items.map((m) => ({
                          _id: m._id, name: m.name, designation: m.designation, phone: m.phone, email: m.email,
                          description: m.whatToContactFor, photo: m.photo, hidden: m.visible === false,
                        }))}
                        emptyText="No members yet"
                        onAdd={canEditMembers ? () => openAddMember(dept._id, team) : undefined}
                        onEditPerson={canEditMembers ? (p) => openEditMember(items.find((m) => m._id === p._id)) : undefined}
                        onDeletePerson={canEditMembers ? (p) => handleDeleteMember(items.find((m) => m._id === p._id)) : undefined}
                      />
                    ))}

                    {canEditMembers && (
                      <button
                        onClick={() => openAddMember(dept._id)}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />Add to a new team
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Department create/edit modal — Super Admin only */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingDept ? 'Edit Department' : 'Create Department'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <Plus className="w-5 h-5 text-gray-500 rotate-45" />
              </button>
            </div>
            <form id="deptForm" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="label">Department Name <span className="text-red-500">*</span></label>
                <input type="text" className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. North, South..." />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input-field resize-none" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description..." />
              </div>

              <div>
                <label className="label !mb-2">HODs in this department</label>
                {hods.length === 0 ? (
                  <p className="text-xs text-gray-400">No HOD users yet.</p>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
                    {hods.map((h) => (
                      <label key={h._id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <input
                          type="checkbox"
                          checked={selectedHodIds.includes(h._id)}
                          onChange={() => toggleId(selectedHodIds, setSelectedHodIds, h._id)}
                        />
                        <span className="truncate">{h.name}</span>
                        {h.departmentId && h.departmentId._id !== editingDept?._id && (
                          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">currently: {h.departmentId.name}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label !mb-2">Counsellors in this department</label>
                {counsellors.length === 0 ? (
                  <p className="text-xs text-gray-400">No Counsellor users yet.</p>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
                    {counsellors.map((c) => (
                      <label key={c._id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <input
                          type="checkbox"
                          checked={selectedCounsellorIds.includes(c._id)}
                          onChange={() => toggleId(selectedCounsellorIds, setSelectedCounsellorIds, c._id)}
                        />
                        <span className="truncate">{c.name}</span>
                        {c.departmentId && c.departmentId._id !== editingDept?._id && (
                          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">currently: {c.departmentId.name}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </form>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button type="submit" form="deptForm" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Directory member add/edit modal — Super Admin or HOD (own department) */}
      {showMemberForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingMember ? 'Edit Member' : 'Add Member'}
              </h2>
              <button onClick={() => setShowMemberForm(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleMemberSubmit} className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  {memberPhotoPreview
                    ? <img src={memberPhotoPreview} alt="" className="w-full h-full object-cover" />
                    : <span className="text-primary-700 dark:text-primary-400 font-bold">{initials(memberForm.name || '?')}</span>}
                </div>
                <label className="btn-secondary cursor-pointer">
                  <Camera className="w-4 h-4" />Choose Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleMemberPhotoChange} />
                </label>
              </div>
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input type="text" className="input-field" value={memberForm.name} onChange={(e) => setMemberForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Mitesh Parmar" />
              </div>
              <div>
                <label className="label">Designation <span className="text-red-500">*</span></label>
                <input type="text" className="input-field" value={memberForm.designation} onChange={(e) => setMemberForm((f) => ({ ...f, designation: e.target.value }))} required placeholder="e.g. Onshore Counsellor" />
              </div>
              <div>
                <label className="label">Sub-team</label>
                <input
                  type="text"
                  className="input-field"
                  list="team-suggestions"
                  value={memberForm.team}
                  onChange={(e) => setMemberForm((f) => ({ ...f, team: e.target.value }))}
                  placeholder="e.g. Onshore, Application Team, Visa Team..."
                />
                <datalist id="team-suggestions">
                  {[...new Set(members.map((m) => m.team).filter(Boolean))].map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="text" className="input-field" value={memberForm.phone} onChange={(e) => setMemberForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 ..." />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="text" className="input-field" value={memberForm.email} onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@kanan.co" />
              </div>
              <div>
                <label className="label">What to contact for</label>
                <textarea className="input-field resize-none" rows={3} value={memberForm.whatToContactFor} onChange={(e) => setMemberForm((f) => ({ ...f, whatToContactFor: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={memberForm.visible} onChange={(e) => setMemberForm((f) => ({ ...f, visible: e.target.checked }))} />
                Visible in directory
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={savingMember}>
                  {savingMember ? 'Saving...' : editingMember ? 'Update Member' : 'Add Member'}
                </button>
                <button type="button" onClick={() => setShowMemberForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
