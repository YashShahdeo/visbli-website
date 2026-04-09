const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../config/database');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');

/**
 * Sign up new user
 */
const signup = async (req, res) => {
  try {
    const { email, password, fullName, organizationName, isPersonal = true } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and tenant in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
        },
      });

      // Create tenant (organization or personal workspace)
      const tenant = await tx.tenant.create({
        data: {
          name: organizationName || `${fullName || email.split('@')[0]}'s Workspace`,
          ownerUserId: user.id,
          isPersonal,
          billingEmail: email,
        },
      });

      // Add user as admin member
      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'admin',
        },
      });

      // Create email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      
      await tx.emailVerification.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          action: 'user_signup',
          resourceType: 'user',
          resourceId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      return { user, tenant, verificationToken };
    });

    // Generate set password token
    const setPasswordToken = generateSetPasswordToken(
      result.user.id,
      result.user.email,
      result.tenant.id
    );

    // Send set password email
    const { sendSetPasswordEmail } = require('../services/emailService');
    await sendSetPasswordEmail(
      result.user.email,
      result.user.fullName,
      setPasswordToken
    );

    // Generate tokens for immediate login (optional - user can also set password first)
    const accessToken = generateAccessToken({ 
      userId: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email
    });
    const refreshToken = generateRefreshToken({ userId: result.user.id });

    // Store refresh token in session
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.session.create({
      data: {
        userId: result.user.id,
        refreshTokenHash,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // TODO: Send verification email with result.verificationToken

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please verify your email.',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          isEmailVerified: result.user.isEmailVerified,
        },
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          isPersonal: result.tenant.isPersonal,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account',
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenantMemberships: {
          where: { status: 'active' },
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or deleted',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ 
      userId: user.id,
      tenantId: user.tenantMemberships[0]?.tenant.id,
      email: user.email
    });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token in session
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user_login',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isEmailVerified: user.isEmailVerified,
        },
        tenants: user.tenantMemberships.map(m => ({
          id: m.tenant.id,
          name: m.tenant.name,
          role: m.role,
          isPersonal: m.tenant.isPersonal,
        })),
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
    });
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const refreshToken = req.body.refreshToken;
      
      if (refreshToken) {
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        
        // Delete session
        await prisma.session.deleteMany({
          where: {
            userId: req.user.id,
            refreshTokenHash,
          },
        });
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'user_logout',
        resourceType: 'user',
        resourceId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        timezone: true,
        isEmailVerified: true,
        status: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
    });
  }
};

/**
 * Set password (for new users from email link)
 */
const setPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required',
      });
    }

    // Verify token
    const { verifyAccessToken } = require('../utils/jwt');
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const { userId, email, tenantId } = decoded;

    // Check if token was already used (check if user already has password)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantMemberships: {
          where: { status: 'active' },
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password and mark email as verified
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        isEmailVerified: true,
      },
    });

    // Generate new tokens for login
    const accessToken = generateAccessToken({ 
      userId: user.id,
      tenantId: tenantId || user.tenantMemberships[0]?.tenant.id,
      email: user.email
    });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token in session
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tenantId: tenantId || user.tenantMemberships[0]?.tenant.id,
        action: 'password_set',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.json({
      success: true,
      message: 'Password set successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isEmailVerified: true,
        },
        tenants: user.tenantMemberships.map(m => ({
          id: m.tenant.id,
          name: m.tenant.name,
          role: m.role,
          isPersonal: m.tenant.isPersonal,
        })),
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting password',
    });
  }
};

/**
 * Verify token
 */
const verifyToken = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isEmailVerified: true,
        status: true,
      },
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid user',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying token',
    });
  }
};

/**
 * Generate set password token
 */
const generateSetPasswordToken = (userId, email, tenantId) => {
  return generateAccessToken({ 
    userId, 
    email, 
    tenantId,
    type: 'set_password'
  });
};

module.exports = {
  signup,
  login,
  logout,
  getProfile,
  setPassword,
  verifyToken,
  generateSetPasswordToken,
};
