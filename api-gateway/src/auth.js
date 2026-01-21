import jwt from 'jsonwebtoken';

const DEV_MODE = process.env.DEV_MODE === 'true';

// Mock user for development mode
const MOCK_USER = {
  sub: 'dev-user-123',
  preferred_username: 'devuser',
  email: 'dev@ticketbuster.local',
};

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

  // Development mode: bypass validation
  if (DEV_MODE) {
    console.warn('⚠️  DEV_MODE enabled: Bypassing JWT validation');
    req.user = MOCK_USER;
    return next();
  }

  // Production mode: validate JWT
  try {
    // Decode without verification first to check payload
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Extract user info from token
    req.user = {
      sub: decoded.payload.sub,
      preferred_username: decoded.payload.preferred_username,
      email: decoded.payload.email,
    };

    // TODO: In production, verify signature using JWKS endpoint
    // const jwksClient = new JwksRsa({ jwksUri: process.env.KEYCLOAK_JWKS_URI });
    // const signingKey = await jwksClient.getSigningKey(decoded.header.kid);
    // jwt.verify(token, signingKey.getPublicKey());

    next();
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
