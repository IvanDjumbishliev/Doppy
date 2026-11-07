import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const socialPlatforms = ["instagram", "tiktok", "youtube"] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];

export const SESSION_COOKIE = "doppy_session";

export type ConnectedAccount = {
  platform: SocialPlatform;
  platformUserId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type ConnectionToSave = ConnectedAccount & {
  sessionId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  scopes: string[];
};

export function isSocialPlatform(value: string): value is SocialPlatform {
  return socialPlatforms.includes(value as SocialPlatform);
}

export function getOAuthStateCookie(platform: SocialPlatform) {
  return `doppy_oauth_state_${platform}`;
}

export function getAppUrl(fallbackUrl: string) {
  const configuredUrl = process.env.APP_URL;
  return configuredUrl ? new URL(configuredUrl).origin : new URL(fallbackUrl).origin;
}

export function getRedirectUri(platform: SocialPlatform, fallbackUrl: string) {
  return new URL(
    `/api/connections/${platform}/callback`,
    getAppUrl(fallbackUrl),
  ).toString();
}

export function getPlatformCredentials(platform: SocialPlatform) {
  switch (platform) {
    case "instagram":
      return {
        clientId: process.env.INSTAGRAM_CLIENT_ID,
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      };
    case "tiktok":
      return {
        clientId: process.env.TIKTOK_CLIENT_KEY,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      };
    case "youtube":
      return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      };
  }
}

export function getMissingSocialSetup(platform: SocialPlatform) {
  const { clientId, clientSecret } = getPlatformCredentials(platform);
  const missing: string[] = [];

  if (!clientId) missing.push(`${platform.toUpperCase()} client ID`);
  if (!clientSecret) missing.push(`${platform.toUpperCase()} client secret`);
  if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  const encryptionKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    missing.push("SOCIAL_TOKEN_ENCRYPTION_KEY");
  } else if (Buffer.from(encryptionKey, "base64").length !== 32) {
    missing.push("a valid 32-byte SOCIAL_TOKEN_ENCRYPTION_KEY");
  }

  return missing;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function getEncryptionKey() {
  const value = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!value) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error(
      "SOCIAL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }
  return key;
}

function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored social token has an invalid format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function saveConnectedAccount(
  connection: ConnectionToSave,
) {
  const { error } = await getSupabaseAdmin()
    .from("social_connections")
    .upsert(
      {
        session_id: connection.sessionId,
        platform: connection.platform,
        platform_user_id: connection.platformUserId,
        username: connection.username,
        display_name: connection.displayName,
        avatar_url: connection.avatarUrl,
        access_token_encrypted: encryptToken(connection.accessToken),
        refresh_token_encrypted: connection.refreshToken
          ? encryptToken(connection.refreshToken)
          : null,
        token_expires_at: connection.tokenExpiresAt ?? null,
        scopes: connection.scopes.join(" "),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,platform" },
    );

  if (error) {
    throw new Error(`Could not save the social connection: ${error.message}`);
  }
}

export async function listConnectedAccounts(sessionId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("social_connections")
    .select("platform,platform_user_id,username,display_name,avatar_url")
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(`Could not load social connections: ${error.message}`);
  }

  return (data ?? []).map((row): ConnectedAccount => {
    if (!isSocialPlatform(row.platform)) {
      throw new Error("The database contains an unsupported social platform.");
    }

    return {
      platform: row.platform,
      platformUserId: row.platform_user_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    };
  });
}

export async function deleteConnectedAccount(
  sessionId: string,
  platform: SocialPlatform,
) {
  const supabase = getSupabaseAdmin();
  const { data, error: readError } = await supabase
    .from("social_connections")
    .select("access_token_encrypted,refresh_token_encrypted")
    .eq("session_id", sessionId)
    .eq("platform", platform)
    .maybeSingle();

  if (readError) {
    throw new Error(`Could not load the social connection: ${readError.message}`);
  }

  let tokens: { accessToken: string; refreshToken?: string } | null = null;
  if (data) {
    try {
      tokens = {
        accessToken: decryptToken(data.access_token_encrypted),
        refreshToken: data.refresh_token_encrypted
          ? decryptToken(data.refresh_token_encrypted)
          : undefined,
      };
    } catch (error) {
      console.error("Could not decrypt a token during account removal.", error);
    }
  }

  const { error } = await supabase
    .from("social_connections")
    .delete()
    .eq("session_id", sessionId)
    .eq("platform", platform);

  if (error) {
    throw new Error(`Could not remove the social connection: ${error.message}`);
  }

  return tokens;
}

export function newSessionId() {
  return randomBytes(32).toString("base64url");
}

export function newOAuthState() {
  return randomBytes(32).toString("base64url");
}
