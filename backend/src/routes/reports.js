const router = require('express').Router();
const { body } = require('express-validator');
const {
  submitReport, getMyReports, getAllReports,
  updateReport, getAnalytics, getTrackerSummary, exportReports, getFormTemplate, getReportLogs,
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/template', getFormTemplate);
router.get('/analytics', getAnalytics);
router.get('/summary', getTrackerSummary);
router.get('/my', getMyReports);
router.get('/all', authorize('HOD', 'SUPER_ADMIN'), getAllReports);
router.get('/logs', authorize('HOD', 'SUPER_ADMIN'), getReportLogs);
router.get('/export', authorize('HOD', 'SUPER_ADMIN'), exportReports);

router.post(
  '/',
  authorize('COUNSELLOR'),
  [
    body('date').isISO8601().withMessage('Valid date required'),
    body('tasks').notEmpty().withMessage('Tasks data required'),
  ],
  validate,
  submitReport
);

router.put('/:id', authorize('COUNSELLOR', 'HOD', 'SUPER_ADMIN'), updateReport);

module.exports = router;
