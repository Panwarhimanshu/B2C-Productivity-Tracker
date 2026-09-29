import api from './axios';

export const attendanceAPI = {
  getMine: (month, year) => api.get('/attendance/me', { params: { month, year } }),
  getTeam: (month, year, departmentId) => api.get('/attendance/team', { params: { month, year, departmentId } }),
};
