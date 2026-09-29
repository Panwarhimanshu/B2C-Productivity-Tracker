const router = require('express').Router();
const { getMyAttendance, getTeamAttendance } = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { HOD_LIKE_ROLES } = require('../config/roles');

router.use(authenticate);

router.get('/me', getMyAttendance);
router.get('/team', authorize(...HOD_LIKE_ROLES, 'SUPER_ADMIN'), getTeamAttendance);

module.exports = router;
