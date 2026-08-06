import api from './axios';

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  hide: (id) => api.patch(`/users/${id}/hide`),
  reactivate: (id) => api.patch(`/users/${id}/reactivate`),
  importUsers: (rows) => api.post('/users/import', { rows }),
  updateDepartment: (id, departmentId) => api.patch(`/users/${id}/department`, { departmentId }),
};
