const router = require('express').Router();
const { body } = require('express-validator');
const { getMembers, createMember, updateMember, deleteMember } = require('../controllers/departmentMemberController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/', getMembers);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'HOD'),
  [
    body('departmentId').notEmpty().withMessage('Department is required'),
    body('name').notEmpty().trim().withMessage('Name required'),
    body('designation').notEmpty().trim().withMessage('Designation required'),
  ],
  validate,
  createMember
);

router.put('/:id', authorize('SUPER_ADMIN', 'HOD'), updateMember);
router.delete('/:id', authorize('SUPER_ADMIN', 'HOD'), deleteMember);

module.exports = router;
