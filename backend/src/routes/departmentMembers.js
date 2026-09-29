const router = require('express').Router();
const { body } = require('express-validator');
const { getMembers, createMember, updateMember, deleteMember } = require('../controllers/departmentMemberController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/', getMembers);

// Org-chart directory editing is Super Admin only — HOD/Associate HOD get view access via
// GET / above, same as everyone else, but can't add/edit/delete entries or new teams.
router.post(
  '/',
  authorize('SUPER_ADMIN'),
  [
    body('departmentId').notEmpty().withMessage('Department is required'),
    body('name').notEmpty().trim().withMessage('Name required'),
    body('designation').notEmpty().trim().withMessage('Designation required'),
  ],
  validate,
  createMember
);

router.put('/:id', authorize('SUPER_ADMIN'), updateMember);
router.delete('/:id', authorize('SUPER_ADMIN'), deleteMember);

module.exports = router;
