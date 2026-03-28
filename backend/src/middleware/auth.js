const { verifyAccessToken } = require('../utils/jwt');
const { prisma } = require('../config/database');

/**
 * Authenticate user middleware
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or deleted',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Check if user is tenant owner or admin
 */
const requireTenantAdmin = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user.id;

    // Check if user is owner
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        ownerUserId: userId,
      },
    });

    if (tenant) {
      req.tenant = tenant;
      return next();
    }

    // Check if user is admin member
    const membership = await prisma.tenantMember.findFirst({
      where: {
        tenantId,
        userId,
        role: 'admin',
        status: 'active',
      },
      include: {
        tenant: true,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You do not have admin access to this organization',
      });
    }

    req.tenant = membership.tenant;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking permissions',
    });
  }
};

/**
 * Check if user is member of tenant
 */
const requireTenantMember = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user.id;

    // Check if user is owner
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        ownerUserId: userId,
      },
    });

    if (tenant) {
      req.tenant = tenant;
      req.userRole = 'owner';
      return next();
    }

    // Check if user is member
    const membership = await prisma.tenantMember.findFirst({
      where: {
        tenantId,
        userId,
        status: 'active',
      },
      include: {
        tenant: true,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this organization',
      });
    }

    req.tenant = membership.tenant;
    req.userRole = membership.role;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking membership',
    });
  }
};

module.exports = {
  authenticate,
  requireTenantAdmin,
  requireTenantMember,
};
