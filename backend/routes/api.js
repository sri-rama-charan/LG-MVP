const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const groupController = require('../controllers/groupController');
const campaignController = require('../controllers/campaignController');
const walletController = require('../controllers/walletController');

// Auth
router.post('/auth/register', authController.register);
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
router.post('/campaigns/:id/launch', campaignController.launchCampaign);

// Wallet
router.get('/wallet', walletController.getBalance);
router.post('/wallet/topup', walletController.topUp);
router.post('/wallet/payout', walletController.requestPayout);

// Webhooks
const webhookController = require('../controllers/webhookController');
router.post('/webhooks/whatsapp', webhookController.handleWhatsappWebhook);

module.exports = router;
