const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.get('/:tenantId/current', authenticate, subscriptionController.getCurrentSubscription);
router.get('/:tenantId/history', authenticate, subscriptionController.getSubscriptionHistory);
router.post('/:tenantId/:subscriptionId/cancel', authenticate, subscriptionController.cancelSubscription);

module.exports = router;
