export type JwtConfig = {
  secret: string;
  expiresIn: string;
};

export type Payload = {
  sub: string;
  email: string;
};

export const accessTokenConfig = (): JwtConfig => {
  const secret = process.env.AUTH_ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error(
      'AUTH_ACCESS_TOKEN_SECRET is not defined in environment variables.',
    );
  }

  return {
    secret,
    expiresIn: '10m',
  };
};

export const refreshTokenConfig = (): JwtConfig => {
  const secret = process.env.AUTH_ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error(
      'AUTH_ACCESS_TOKEN_SECRET is not defined in environment variables.',
    );
  }

  return {
    secret,
    expiresIn: '10m',
  };
};
