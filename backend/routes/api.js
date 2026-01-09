const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const groupController = require('../controllers/groupController');
const campaignController = require('../controllers/campaignController');
const walletController = require('../controllers/walletController');

// Auth
router.post('/auth/register', authController.register);
router.post('/auth/verify-otp', authController.verifyOtp);
router.post('/auth/login', authController.login);

// Groups (GA)
router.post('/groups', groupController.createGroup);
router.get('/groups', groupController.listGroups);
router.post('/groups/members', groupController.addMembers);
router.get('/groups/available', groupController.getAvailableGroups); // For Brands
router.get('/groups/:id/members', groupController.getMembers);

// Campaigns (Brand)
router.post('/campaigns', campaignController.createCampaign);
router.get('/campaigns', campaignController.listCampaigns);
router.get('/campaigns/estimate-cost', campaignController.estimateCost);
router.post('/campaigns/:id/launch', campaignController.launchCampaign);
router.post('/campaigns/:id/groups', campaignController.addGroups);
router.delete('/campaigns/:id/groups/:groupId', campaignController.removeGroup);
router.post('/campaigns/:id/schedule', campaignController.addSchedule);
router.delete('/campaigns/:id', campaignController.deleteCampaign);

// Wallet
router.get('/wallet', walletController.getBalance);
router.post('/wallet/topup', walletController.topUp);
router.post('/wallet/payout', walletController.requestPayout);

// Subscriptions (Brand)
const subscriptionController = require('../controllers/subscriptionController');
router.get('/subscriptions/plans', subscriptionController.getPlans);
router.post('/subscriptions/purchase', subscriptionController.purchaseSubscription);

// Webhooks
const webhookController = require('../controllers/webhookController');
router.post('/webhooks/whatsapp', webhookController.handleWhatsappWebhook);

// Dashboard
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../utils/authMiddleware');
router.get('/dashboard/stats', authMiddleware, dashboardController.getDashboardStats);

module.exports = router;
