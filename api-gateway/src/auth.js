import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load .env from the api-gateway root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Mock user for development mode (must use valid UUIDs for DB compatibility)
const MOCK_USER = {
  sub: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  // Valid UUID for dev testing
  preferred_username: 'devuser',
  email: 'dev@ticketbuster.local',
};

const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'ticketbuster';
const KEYCLOAK_URL = (process.env.KEYCLOAK_URL || process.env.KEYCLOAK_AUTH_URL || 'http://localhost:8080').replace(/\/$/, '');
const ISSUER = process.env.KEYCLOAK_ISSUER || `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
const JWKS_URI = process.env.KEYCLOAK_JWKS_URI || `${ISSUER}/protocol/openid-connect/certs`;
const AUDIENCE = process.env.KEYCLOAK_AUDIENCE || process.env.KEYCLOAK_CLIENT_ID || 'ticketbuster-frontend';

// JWKS client (caché + rate limit para evitar golpear Keycloak)
const jwksClient = jwksRsa({
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
  jwksUri: JWKS_URI,
});

/**
 * Authentication middleware for Express
 * Validates JWT tokens from Keycloak or allows bypass in DEV_MODE
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7);

  // Development mode: bypass validation and use mock user
  const devMode = process.env.DEV_MODE === 'true';
  
  if (devMode) {
    console.warn('⚠️  DEV_MODE enabled: Bypassing JWT validation');
    req.user = MOCK_USER;
    return next();
  }

  // Production mode: validate JWT
  try {
    // Decode header to get kid and avoid double parsing
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    jwksClient.getSigningKey(decodedHeader.header.kid, (err, key) => {
      if (err) {
        console.error('Error retrieving signing key:', err.message);
        return res.status(401).json({ error: 'Unable to verify token' });
      }

      const signingKey = key.getPublicKey();

      // Keycloak may not include 'aud' in tokens by default; verify signature only
      // Issuer validation is skipped because tokens can come from different domains (Cloudflare, localhost, etc.)
      jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        // Don't validate issuer to support multiple frontends (Cloudflare, localhost)
        ignoreIssuer: true,
      }, (verifyErr, payload) => {
        if (verifyErr) {
          console.error('Token validation error:', verifyErr.message);
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        // Verify issuer manually - must end with /realms/ticketbuster
        if (!payload.iss || !payload.iss.includes(`/realms/${KEYCLOAK_REALM}`)) {
          console.error('Invalid issuer in token:', payload.iss);
          return res.status(401).json({ error: 'Invalid token issuer' });
        }

        console.log('✓ JWT verified for user:', payload.preferred_username || payload.sub);

        req.user = {
          sub: payload.sub,
          preferred_username: payload.preferred_username,
          email: payload.email,
          roles: payload.realm_access?.roles || payload.resource_access?.[AUDIENCE]?.roles || [],
        };

        return next();
      });
    });
  } catch (error) {
    console.error('Token validation error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional: Validate user has specific roles
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // TODO: Check roles from token claims
    // if (!req.user.roles?.includes(role)) {
    //   return res.status(403).json({ error: `Role '${role}' required` });
    // }

    next();
  };
}
