const router = require('express').Router();
const { upsertTarget, getTargetsTable, getTargetWithActuals, importTargets } = require('../controllers/targetController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.use(authenticate);

router.get('/table',        authorize('SUPER_ADMIN'), getTargetsTable);
router.get('/user/:userId', getTargetWithActuals);
router.post('/',            authorize('SUPER_ADMIN'), upsertTarget);
router.post('/import',      authorize('SUPER_ADMIN'), importTargets);

module.exports = router;
