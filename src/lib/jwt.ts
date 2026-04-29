type JwtAlgorithm = "HS256";

type JwtInput = {
  secret: string;
  payload: Record<string, unknown>;
  expiresInSeconds: number;
};

export type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
};

type VerifyJwtInput = {
  token: string;
  secret: string;
};

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.padEnd(
    input.length + ((4 - (input.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(
    new Uint8Array([...binary].map((c) => c.charCodeAt(0))),
  );
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function signJwt(input: JwtInput): Promise<string> {
  const header = {
    alg: "HS256" satisfies JwtAlgorithm,
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...input.payload,
    iat: now,
    exp: now + input.expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const key = await importHmacKey(input.secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(unsignedToken),
  );

  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyJwt(
  input: VerifyJwtInput,
): Promise<{ valid: true; payload: JwtPayload } | { valid: false }> {
  try {
    const parts = input.token.split(".");

    if (parts.length !== 3) {
      return { valid: false };
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Reconstruct and verify signature
    const key = await importHmacKey(input.secret);
    const message = `${encodedHeader}.${encodedPayload}`;

    const signatureBytes = new Uint8Array(
      atob(signature.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => c.charCodeAt(0)),
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(message),
    );

    if (!isValid) {
      return { valid: false };
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;

    // Verify expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
