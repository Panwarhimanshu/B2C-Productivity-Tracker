const router = require('express').Router();
const { body } = require('express-validator');
const { getDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/', getDepartments);

router.post(
  '/',
  authorize('SUPER_ADMIN'),
  [body('name').notEmpty().trim().withMessage('Department name required')],
  validate,
  createDepartment
);

router.put('/:id', authorize('SUPER_ADMIN'), updateDepartment);
router.delete('/:id', authorize('SUPER_ADMIN'), deleteDepartment);

module.exports = router;
