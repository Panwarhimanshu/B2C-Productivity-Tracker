const router = require('express').Router();
const { body } = require('express-validator');
const {
  getUsers, getUserById, createUser, updateUser, hideUser, reactivateUser, importUsers, updateUserDepartment,
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { ALL_ROLES } = require('../config/roles');

router.use(authenticate);

router.get('/', authorize(...ALL_ROLES), getUsers);
router.get('/:id', authorize('HOD', 'ASSOCIATE_HOD', 'SUPER_ADMIN'), getUserById);

router.post(
  '/',
  authorize('SUPER_ADMIN'),
  [
    body('name').notEmpty().trim().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(ALL_ROLES).withMessage('Invalid role'),
  ],
  validate,
  createUser
);

router.post('/import', authorize('SUPER_ADMIN'), importUsers);
router.put('/:id', authorize('SUPER_ADMIN'), updateUser);
router.patch('/:id/hide', authorize('SUPER_ADMIN'), hideUser);
router.patch('/:id/reactivate', authorize('SUPER_ADMIN'), reactivateUser);
router.patch('/:id/department', authorize('SUPER_ADMIN'), updateUserDepartment);

module.exports = router;
