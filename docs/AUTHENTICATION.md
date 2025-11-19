# Authentication Guide

## Overview

The B2B E-commerce Platform API uses **JWT (JSON Web Tokens)** for authentication. This guide explains how to authenticate, manage tokens, and handle common authentication scenarios.

## Authentication Flow

```
1. Login with credentials
   ↓
2. Receive access token + refresh token
   ↓
3. Use access token for API requests
   ↓
4. When access token expires, use refresh token
   ↓
5. Receive new access token
   ↓
6. Continue making API requests
```

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `SUPER_ADMIN` | Full administrative access | All endpoints, all operations |
| `BUYER` | Can place orders | View products, create/view orders, manage cart |
| `APPROVER` | Can approve orders | View orders, approve/reject orders |

## Endpoints

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx123...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "SUPER_ADMIN",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "status": "error",
  "message": "Invalid credentials"
}
```

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "secure-password",
  "firstName": "Jane",
  "lastName": "Smith",
  "companyId": "clx456..."
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx789...",
      "email": "newuser@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "BUYER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <access-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "SUPER_ADMIN",
    "isActive": true,
    "company": {
      "id": "clx456...",
      "name": "Acme Corp"
    }
  }
}
```

## Token Details

### Access Token
- **Purpose**: Authenticate API requests
- **Expiration**: 1 hour
- **Storage**: Memory (recommended) or secure storage
- **Usage**: Include in Authorization header

### Refresh Token
- **Purpose**: Obtain new access tokens
- **Expiration**: 7 days
- **Storage**: Secure HTTP-only cookie or secure storage
- **Usage**: Send to refresh endpoint when access token expires

## Using Tokens

### Authorization Header

All authenticated requests must include the access token:

```
Authorization: Bearer <your-access-token>
```

### Example Request

```bash
curl -X GET http://localhost:3001/api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Token Management

### Storing Tokens

**Frontend (Browser):**
```javascript
// Store in memory (most secure)
let accessToken = '';

async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  accessToken = data.data.accessToken;
  // Store refresh token in HTTP-only cookie (server-side)
}

function getHeaders() {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}
```

**Backend/Server:**
```javascript
// Store in environment variables or secure vault
const accessToken = process.env.API_ACCESS_TOKEN;
```

### Refreshing Tokens

Implement automatic token refresh:

```javascript
class APIClient {
  constructor() {
    this.accessToken = '';
    this.refreshToken = '';
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        // Retry original request
        return this.request(endpoint, options);
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed, redirect to login
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    const data = await response.json();
    this.accessToken = data.data.accessToken;
    this.refreshToken = data.data.refreshToken;
  }
}
```

### Token Validation

Tokens are validated on every request. A token is invalid if:
- It's malformed or corrupted
- It's expired
- The user has been deactivated
- The token has been revoked

## Security Best Practices

### 1. Never Expose Tokens

❌ **Don't:**
```javascript
// Don't log tokens
console.log('Token:', accessToken);

// Don't commit tokens
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Don't send tokens in URL
fetch(`/api/products?token=${accessToken}`);
```

✅ **Do:**
```javascript
// Use Authorization header
fetch('/api/products', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Use environment variables
const token = process.env.API_TOKEN;
```

### 2. Secure Storage

**Browser:**
- **Best**: Memory (resets on page refresh)
- **Good**: SessionStorage (clears on tab close)
- **Avoid**: LocalStorage (persists, vulnerable to XSS)
- **Never**: URL parameters or cookies without HttpOnly/Secure flags

**Server:**
- **Best**: Environment variables or secret management service (AWS Secrets Manager, HashiCorp Vault)
- **Good**: Encrypted configuration files
- **Avoid**: Plain text files
- **Never**: Hard-coded in source code

### 3. Use HTTPS

Always use HTTPS in production to prevent token interception:

```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.example.com'
  : 'http://localhost:3001';
```

### 4. Handle Token Expiration

Implement graceful handling of expired tokens:

```javascript
async function apiCall(endpoint) {
  try {
    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (response.status === 401) {
      // Try refresh
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry request
        return apiCall(endpoint);
      } else {
        // Redirect to login
        redirectToLogin();
      }
    }

    return response.json();
  } catch (error) {
    handleError(error);
  }
}
```

### 5. Implement Logout

Always provide a way to logout and invalidate tokens:

```javascript
async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
  } finally {
    // Clear tokens even if API call fails
    accessToken = '';
    refreshToken = '';
    redirectToLogin();
  }
}
```

## Common Scenarios

### Scenario 1: Single Page Application (SPA)

```javascript
// auth.service.js
class AuthService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(email, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    this.accessToken = data.data.accessToken;
    this.refreshToken = data.data.refreshToken;
    return data.data.user;
  }

  async logout() {
    if (this.accessToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
      });
    }
    this.accessToken = null;
    this.refreshToken = null;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }
}

export default new AuthService();
```

### Scenario 2: Server-to-Server Communication

```javascript
// api-client.js
const axios = require('axios');

class APIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.accessToken = null;
  }

  async authenticate() {
    const response = await axios.post('/api/auth/login', {
      email: process.env.API_EMAIL,
      password: process.env.API_PASSWORD,
    });
    this.accessToken = response.data.data.accessToken;
  }

  async request(method, endpoint, data = {}) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const response = await axios({
        method,
        url: endpoint,
        data,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Re-authenticate and retry
        await this.authenticate();
        return this.request(method, endpoint, data);
      }
      throw error;
    }
  }
}

module.exports = new APIClient(process.env.API_KEY);
```

### Scenario 3: Mobile Application

```javascript
// AsyncStorage for React Native
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthManager {
  async saveTokens(accessToken, refreshToken) {
    await AsyncStorage.multiSet([
      ['@access_token', accessToken],
      ['@refresh_token', refreshToken],
    ]);
  }

  async getAccessToken() {
    return await AsyncStorage.getItem('@access_token');
  }

  async getRefreshToken() {
    return await AsyncStorage.getItem('@refresh_token');
  }

  async clearTokens() {
    await AsyncStorage.multiRemove(['@access_token', '@refresh_token']);
  }

  async refreshAccessToken() {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    await this.saveTokens(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
  }
}

export default new AuthManager();
```

## Troubleshooting

### "Invalid token" Error

**Causes:**
- Token has expired
- Token is malformed
- Token was issued by different server
- User has been deactivated

**Solutions:**
1. Try refreshing the token
2. Re-authenticate if refresh fails
3. Check token format (should be JWT)
4. Verify user account is active

### "Forbidden" Error (403)

**Cause:** User doesn't have permission for the requested operation

**Solutions:**
- Check user role (SUPER_ADMIN, BUYER, APPROVER)
- Verify endpoint permissions
- Contact administrator for role assignment

### Token Not Being Sent

**Causes:**
- Header not set correctly
- Token variable is empty
- CORS issues

**Debug:**
```javascript
// Log headers being sent
console.log('Headers:', {
  'Authorization': `Bearer ${accessToken}`,
});

// Check if token exists
if (!accessToken) {
  console.error('Access token is missing!');
}
```

## FAQ

**Q: How long do tokens last?**
A: Access tokens last 1 hour, refresh tokens last 7 days.

**Q: Can I extend token expiration?**
A: No, but you can use the refresh endpoint to get new tokens before expiration.

**Q: What happens if my refresh token expires?**
A: You'll need to login again with your credentials.

**Q: Can I have multiple active sessions?**
A: Yes, you can login from multiple devices. Each will have its own token pair.

**Q: How do I revoke a token?**
A: Use the logout endpoint, or contact support to revoke all tokens for your account.

**Q: Is the API key the same as the access token?**
A: No, access tokens are obtained via login. API keys are for server-to-server authentication (if enabled).

## Additional Resources

- [Developer Guide](./DEVELOPER_GUIDE.md)
- [API Documentation](http://localhost:3001/api-docs)
- [Security Best Practices](./SECURITY.md)

---

**Last Updated:** 2025-11-19
**API Version:** 1.0.0
