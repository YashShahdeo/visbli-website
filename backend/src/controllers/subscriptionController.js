const { prisma } = require('../config/database');

/**
 * Get current subscription for tenant
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;
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

    // Get active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'trialing'] },
      },
      include: {
        plan: {
          include: {
            features: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          subscription: null,
          message: 'No active subscription',
        },
      });
    }

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription',
    });
  }
};

/**
 * Get subscription history for tenant
 */
const getSubscriptionHistory = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user.id;

    // Verify user has access
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        OR: [
          { ownerUserId: userId },
          {
            members: {
              some: {
                userId,
                role: { in: ['admin', 'member'] },
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

    const subscriptions = await prisma.subscription.findMany({
      where: { tenantId },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { subscriptions },
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription history',
    });
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (req, res) => {
  try {
    const { tenantId, subscriptionId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    // Verify user is admin
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
        message: 'You do not have admin access to this organization',
      });
    }

    // Get subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    if (subscription.status === 'canceled') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already canceled',
      });
    }

    // Cancel subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        cancellationReason: reason || 'User requested cancellation',
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        tenantId,
        type: 'subscription_canceled',
        title: 'Subscription Canceled',
        message: 'Your subscription has been canceled successfully.',
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        tenantId,
        action: 'subscription_canceled',
        resourceType: 'subscription',
        resourceId: subscriptionId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { reason },
      },
    });

    res.json({
      success: true,
      message: 'Subscription canceled successfully',
      data: { subscription: updatedSubscription },
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error canceling subscription',
    });
  }
};

module.exports = {
  getCurrentSubscription,
  getSubscriptionHistory,
  cancelSubscription,
};
