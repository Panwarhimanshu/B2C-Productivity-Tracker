const router = require('express').Router();
const { upsertTarget, getTargetsTable, getTargetWithActuals, importTargets } = require('../controllers/targetController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(authenticate);

// Associate HOD is deliberately excluded — they get department-wide report visibility, but
// target-setting stays with HOD/Super Admin only.
router.get('/table',        authorize('HOD', 'SUPER_ADMIN'), getTargetsTable);
router.get('/user/:userId', getTargetWithActuals);
router.post('/',            authorize('HOD', 'SUPER_ADMIN'), upsertTarget);
router.post('/import',      authorize('SUPER_ADMIN'), importTargets);

module.exports = router;
