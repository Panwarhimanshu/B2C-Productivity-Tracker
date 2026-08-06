import api from './axios';

export const targetsAPI = {
  getTable:        (year, month, country) => api.get('/targets/table', { params: { year, month, country } }),
  upsert:          (data)              => api.post('/targets', data),
  getMyWithActuals:(month, year)       => api.get('/targets/user/me',      { params: { month, year } }),
  getForUser:      (userId, month, year) => api.get(`/targets/user/${userId}`, { params: { month, year } }),
  importTargets:   (rows)                => api.post('/targets/import', { rows }),
};
