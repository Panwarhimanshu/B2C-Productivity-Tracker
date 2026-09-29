const router = require('express').Router();
const {
  requireDeviceAuth, login, poll, getCommand, getConfiguration, setEvent,
} = require('../controllers/matrixController');

// Device-facing only — deliberately NOT behind our normal JWT `authenticate` middleware,
// since the Matrix device can't do that login flow. Gated instead by requireDeviceAuth
// (HTTP Basic Auth, see matrixController for details).
router.use(requireDeviceAuth);

router.get('/login', login);
router.get('/poll', poll);
router.get('/getcmd', getCommand);
router.get('/getcnfg', getConfiguration);
router.get('/setevent', setEvent);

module.exports = router;
