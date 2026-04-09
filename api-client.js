// API Client for Visbli Frontend
// Automatically detects environment and uses correct API URL
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : 'https://visbli-website.onrender.com/api';

// Token management
const TokenManager = {
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  getAccessToken() {
    return localStorage.getItem('accessToken');
  },

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  },

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
  },

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  setTenant(tenant) {
    localStorage.setItem('tenant', JSON.stringify(tenant));
  },

  getTenant() {
    const tenant = localStorage.getItem('tenant');
    return tenant ? JSON.parse(tenant) : null;
  },

  isAuthenticated() {
    return !!this.getAccessToken();
  },
};

// API Client
const ApiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = TokenManager.getAccessToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (token && !options.skipAuth) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map(err => `${err.field}: ${err.message}`).join('\n');
          throw new Error(errorMessages);
        }
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Auth endpoints
  async signup(email, password, fullName, organizationName) {
    const body = {
      email,
      password,
      fullName,
      isPersonal: !organizationName,
    };

    // Only include organizationName if it's provided
    if (organizationName) {
      body.organizationName = organizationName;
    }

    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
      skipAuth: true,
    });

    if (data.success) {
      TokenManager.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
      TokenManager.setUser(data.data.user);
      TokenManager.setTenant(data.data.tenant);
    }

    return data;
  },

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    if (data.success) {
      TokenManager.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
      TokenManager.setUser(data.data.user);
      if (data.data.tenants && data.data.tenants.length > 0) {
        TokenManager.setTenant(data.data.tenants[0]);
      }
    }

    return data;
  },

  async logout() {
    const refreshToken = TokenManager.getRefreshToken();
    
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } finally {
      TokenManager.clearTokens();
    }
  },

  async getProfile() {
    return await this.request('/auth/profile');
  },

  // Payment endpoints
  async getPlans() {
    return await this.request('/payments/plans', { skipAuth: true });
  },

  async createOrder(planId, tenantId, userCount = 1) {
    return await this.request('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ planId, tenantId, userCount }),
    });
  },

  async verifyPayment(paymentData) {
    return await this.request('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  // Subscription endpoints
  async getCurrentSubscription(tenantId) {
    return await this.request(`/subscriptions/${tenantId}/current`);
  },

  async getSubscriptionHistory(tenantId) {
    return await this.request(`/subscriptions/${tenantId}/history`);
  },

  async cancelSubscription(tenantId, subscriptionId, reason) {
    return await this.request(`/subscriptions/${tenantId}/${subscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

// Export for use in HTML files
window.ApiClient = ApiClient;
window.TokenManager = TokenManager;
