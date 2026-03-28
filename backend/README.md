# Visbli Backend API

Enterprise-grade backend for Visbli platform with multi-tenant architecture, authentication, and Razorpay payment integration.

## Features

- ✅ Multi-tenant architecture with proper data isolation
- ✅ JWT-based authentication with refresh tokens
- ✅ Secure password hashing with bcrypt
- ✅ Email verification system
- ✅ Password reset functionality
- ✅ Razorpay payment integration
- ✅ Subscription management
- ✅ Audit logging
- ✅ Rate limiting and security headers
- ✅ PostgreSQL with Prisma ORM

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Payment**: Razorpay
- **Security**: Helmet, CORS, Rate Limiting

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - Your Supabase PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens
- `RAZORPAY_KEY_ID` - Your Razorpay key ID
- `RAZORPAY_KEY_SECRET` - Your Razorpay secret key

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Push Database Schema

```bash
npm run prisma:push
```

Or create a migration:

```bash
npm run prisma:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication

#### POST `/api/auth/signup`
Register a new user and create their workspace.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe",
  "organizationName": "Acme Corp",
  "isPersonal": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe"
    },
    "tenant": {
      "id": "uuid",
      "name": "Acme Corp"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token"
    }
  }
}
```

#### POST `/api/auth/login`
Login existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### POST `/api/auth/logout`
Logout user (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

#### GET `/api/auth/profile`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

### Health Check

#### GET `/health`
Check if API is running.

## Database Schema

The database includes the following main tables:

- **users** - User accounts
- **tenants** - Organizations/workspaces
- **tenant_members** - User-tenant relationships
- **plans** - Subscription plans
- **subscriptions** - Active subscriptions
- **payments** - Payment records
- **invoices** - Invoice records
- **sessions** - User sessions
- **email_verifications** - Email verification tokens
- **password_resets** - Password reset tokens
- **audit_logs** - Audit trail
- **notifications** - User notifications
- **webhooks_log** - Webhook event logs

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT tokens with expiration
- Refresh token rotation
- Rate limiting (100 requests per 15 minutes)
- Helmet security headers
- CORS protection
- SQL injection prevention (Prisma)
- Input validation
- Audit logging

## Development Tools

### Prisma Studio
View and edit your database:
```bash
npm run prisma:studio
```

### View Logs
All errors and important events are logged to console.

## Next Steps

1. ✅ Basic authentication implemented
2. 🔄 Add Razorpay payment integration (next)
3. 🔄 Add subscription management endpoints
4. 🔄 Add email service integration
5. 🔄 Add password reset functionality
6. 🔄 Add webhook handlers

## Support

For issues or questions, contact the Visbli team.
