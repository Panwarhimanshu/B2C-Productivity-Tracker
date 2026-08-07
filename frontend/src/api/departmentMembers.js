import api from './axios';

export const departmentMembersAPI = {
  getAll: (departmentId) => api.get('/department-members', { params: { departmentId } }),
  create: (data) => api.post('/department-members', data),
  update: (id, data) => api.put(`/department-members/${id}`, data),
  delete: (id) => api.delete(`/department-members/${id}`),
};
