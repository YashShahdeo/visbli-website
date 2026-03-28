const crypto = require('crypto');
const { prisma } = require('../config/database');
const razorpayInstance = require('../config/razorpay');
const { sendPaymentConfirmation } = require('../services/emailService');

/**
 * Get all available plans
 */
const getPlans = async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        features: true,
      },
      orderBy: { price: 'asc' },
    });

    res.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plans',
    });
  }
};

/**
 * Create Razorpay order for subscription
 */
const createOrder = async (req, res) => {
  try {
    const { planId, tenantId, userCount = 1 } = req.body;
    const userId = req.user.id;

    // Verify user has access to tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        OR: [
          { ownerUserId: userId },
          {
            members: {
              some: {
                userId,
                role: 'admin',
                status: 'active',
              },
            },
          },
        ],
      },
    });

    if (!tenant) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this organization',
      });
    }

    // Get plan details
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive',
      });
    }

    if (parseFloat(plan.price) === 0) {
      return res.status(400).json({
        success: false,
        message: 'This is a free plan, no payment required',
      });
    }

    // Calculate total amount based on user count
    const pricePerUser = parseFloat(plan.price);
    const totalAmount = pricePerUser * userCount;
    
    // Create Razorpay order
    const amount = Math.round(totalAmount * 100); // Convert to paise
    const currency = 'INR';

    const orderOptions = {
      amount,
      currency,
      receipt: `rcpt_${Date.now()}`, // Keep it short (max 40 chars)
      notes: {
        tenantId,
        planId,
        userId,
        planName: plan.name,
        userCount: userCount.toString(),
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

    // Store payment record as pending
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        amount: totalAmount.toString(),
        currency,
        provider: 'razorpay',
        razorpayOrderId: razorpayOrder.id,
        status: 'pending',
        metadata: {
          planId,
          planName: plan.name,
          userCount,
          pricePerUser,
          razorpayOrderData: razorpayOrder,
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        tenantId,
        action: 'payment_order_created',
        resourceType: 'payment',
        resourceId: payment.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          planId,
          amount,
          userCount,
          orderId: razorpayOrder.id,
        },
      },
    });

    res.json({
      success: true,
      data: {
        order: {
          id: razorpayOrder.id,
          amount,
          currency,
        },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          userCount,
          totalAmount,
        },
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order',
    });
  }
};

/**
 * Verify Razorpay payment signature
 */
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      tenantId,
    } = req.body;

    const userId = req.user.id;

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // Get payment record
    const payment = await prisma.payment.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
        tenantId,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Get plan details
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    // Update payment as successful
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'success',
        metadata: {
          ...payment.metadata,
          verifiedAt: new Date().toISOString(),
        },
      },
    });

    // Create or update subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'trialing'] },
      },
    });

    let subscription;
    const startDate = new Date();
    const endDate = new Date();
    
    if (plan.billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    if (existingSubscription) {
      // Cancel existing subscription
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
          cancellationReason: 'Upgraded to new plan',
        },
      });
    }

    // Create new subscription
    subscription = await prisma.subscription.create({
      data: {
        tenantId,
        planId,
        status: plan.trialDays > 0 ? 'trialing' : 'active',
        billingCycle: plan.billingCycle,
        startDate,
        endDate,
        nextBillingDate: endDate,
        trialStart: plan.trialDays > 0 ? startDate : null,
        trialEnd: plan.trialDays > 0 
          ? new Date(startDate.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    // Link payment to subscription
    await prisma.payment.update({
      where: { id: updatedPayment.id },
      data: { subscriptionId: subscription.id },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        tenantId,
        type: 'payment_success',
        title: 'Payment Successful',
        message: `Your payment for ${plan.name} plan has been processed successfully.`,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        tenantId,
        action: 'payment_verified',
        resourceType: 'subscription',
        resourceId: subscription.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          paymentId: updatedPayment.id,
          planId,
          amount: payment.amount,
        },
      },
    });

    // Send payment confirmation email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    if (user) {
      const userCount = payment.metadata?.userCount || 1;
      await sendPaymentConfirmation(user.email, user.fullName, {
        planName: plan.name,
        amount: payment.amount,
        userCount,
        subscriptionEndDate: subscription.endDate,
        paymentId: updatedPayment.providerPaymentId,
      });
    }

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        },
        payment: {
          id: updatedPayment.id,
          amount: updatedPayment.amount,
          status: updatedPayment.status,
        },
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
    });
  }
};

/**
 * Handle Razorpay webhooks
 */
const handleWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    // Log webhook
    const webhookLog = await prisma.webhookLog.create({
      data: {
        provider: 'razorpay',
        eventType: event,
        payload: req.body,
        status: 'received',
      },
    });

    // Handle different event types
    switch (event) {
      case 'payment.captured':
        // Payment successful
        await handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        // Payment failed
        await handlePaymentFailed(payload);
        break;

      case 'subscription.cancelled':
        // Subscription cancelled
        await handleSubscriptionCancelled(payload);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    // Update webhook log as processed
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Log error in webhook
    if (req.body) {
      await prisma.webhookLog.create({
        data: {
          provider: 'razorpay',
          eventType: req.body.event || 'unknown',
          payload: req.body,
          status: 'failed',
          errorMessage: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

// Helper functions for webhook events
async function handlePaymentCaptured(payload) {
  const paymentEntity = payload.payment.entity;
  
  await prisma.payment.updateMany({
    where: { razorpayOrderId: paymentEntity.order_id },
    data: {
      status: 'success',
      providerPaymentId: paymentEntity.id,
    },
  });
}

async function handlePaymentFailed(payload) {
  const paymentEntity = payload.payment.entity;
  
  await prisma.payment.updateMany({
    where: { razorpayOrderId: paymentEntity.order_id },
    data: {
      status: 'failed',
      failureReason: paymentEntity.error_description,
    },
  });
}

async function handleSubscriptionCancelled(payload) {
  const subscriptionEntity = payload.subscription.entity;
  
  await prisma.subscription.updateMany({
    where: { razorpaySubscriptionId: subscriptionEntity.id },
    data: {
      status: 'canceled',
      canceledAt: new Date(),
    },
  });
}

module.exports = {
  getPlans,
  createOrder,
  verifyPayment,
  handleWebhook,
};
