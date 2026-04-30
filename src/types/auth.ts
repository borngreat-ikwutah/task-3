export class AuthError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const AUTH_ERRORS = {
  MISSING_TOKEN: {
    code: "MISSING_TOKEN",
    statusCode: 401,
    message: "Missing authorization token",
  },
  INVALID_TOKEN: {
    code: "INVALID_TOKEN",
    statusCode: 401,
    message: "Invalid or malformed token",
  },
  EXPIRED_TOKEN: {
    code: "EXPIRED_TOKEN",
    statusCode: 401,
    message: "Token has expired",
  },
  INVALID_TOKEN_TYPE: {
    code: "INVALID_TOKEN_TYPE",
    statusCode: 401,
    message: "Invalid token type",
  },
  USER_INACTIVE: {
    code: "USER_INACTIVE",
    statusCode: 403,
    message: "User account is inactive",
  },
  INSUFFICIENT_PERMISSIONS: {
    code: "INSUFFICIENT_PERMISSIONS",
    statusCode: 403,
    message: "Insufficient permissions for this resource",
  },
  INVALID_GITHUB_CODE: {
    code: "INVALID_GITHUB_CODE",
    statusCode: 400,
    message: "Invalid GitHub authorization code",
  },
  GITHUB_EXCHANGE_FAILED: {
    code: "GITHUB_EXCHANGE_FAILED",
    statusCode: 502,
    message: "Failed to exchange code with GitHub",
  },
  MISSING_OAUTH_CONFIG: {
    code: "MISSING_OAUTH_CONFIG",
    statusCode: 500,
    message: "OAuth provider not configured",
  },
  MISSING_JWT_CONFIG: {
    code: "MISSING_JWT_CONFIG",
    statusCode: 500,
    message: "JWT secrets not configured",
  },
  INVALID_STATE: {
    code: "INVALID_STATE",
    statusCode: 400,
    message: "Invalid OAuth state parameter",
  },
  INVALID_PKCE: {
    code: "INVALID_PKCE",
    statusCode: 400,
    message: "Invalid PKCE challenge",
  },
  INVALID_REFRESH_TOKEN: {
    code: "INVALID_REFRESH_TOKEN",
    statusCode: 401,
    message: "Invalid or revoked refresh token",
  },
} as const;

export type AuthenticatedUser = {
  id: string;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
  role: "admin" | "analyst";
  isActive: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};
