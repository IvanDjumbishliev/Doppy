import { NextRequest, NextResponse } from "next/server";
import {
  getAppUrl,
  getOAuthStateCookie,
  getPlatformCredentials,
  getRedirectUri,
  isSocialPlatform,
  saveConnectedAccount,
  SESSION_COOKIE,
  SocialPlatform,
} from "@/lib/social-connections";

type RouteContext = {
  params: { platform: string };
};

type JsonRecord = Record<string, unknown>;

type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

type Profile = {
  platformUserId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown, key: string) {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  if (typeof field === "string" || typeof field === "number") {
    return String(field);
  }
  return undefined;
}

function getRequiredString(value: unknown, key: string) {
  const result = getString(value, key);
  if (!result) {
    throw new Error(`OAuth response is missing ${key}.`);
  }
  return result;
}

async function readProviderJson(response: Response, provider: string) {
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(`${provider} returned an invalid response.`);
  }

  if (!response.ok) {
    throw new Error(`${provider} OAuth request failed (${response.status}).`);
  }
  if (
    isRecord(result) &&
    isRecord(result.error) &&
    typeof result.error.message === "string"
  ) {
    throw new Error(`${provider} OAuth request failed: ${result.error.message}`);
  }
  return result;
}

function getExpiry(expiresIn: number | undefined) {
  return expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : undefined;
}

async function connectInstagram(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ tokens: TokenSet; profile: Profile; scopes: string[] }> {
  const form = new FormData();
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", redirectUri);
  form.set("code", code);
  const shortToken = await readProviderJson(
    await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: form,
    }),
    "Instagram",
  );
  const shortTokenData =
    isRecord(shortToken) && Array.isArray(shortToken.data)
      ? shortToken.data[0]
      : undefined;
  const shortAccessToken = getRequiredString(shortTokenData, "access_token");
  const longTokenUrl = new URL("https://graph.instagram.com/access_token");
  longTokenUrl.search = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: shortAccessToken,
  }).toString();
  const longToken = await readProviderJson(
    await fetch(longTokenUrl),
    "Instagram",
  );
  const accessToken = getRequiredString(longToken, "access_token");
  const profileUrl = new URL("https://graph.instagram.com/me");
  profileUrl.search = new URLSearchParams({
    fields: "user_id,username,account_type",
    access_token: accessToken,
  }).toString();
  const profileData = await readProviderJson(
    await fetch(profileUrl),
    "Instagram",
  );
  const username = getRequiredString(profileData, "username");

  return {
    tokens: {
      accessToken,
      expiresIn: Number(getString(longToken, "expires_in")),
    },
    profile: {
      platformUserId: getRequiredString(profileData, "user_id"),
      username,
      displayName: username,
      avatarUrl: null,
    },
    scopes: ["instagram_business_basic"],
  };
}

async function connectTikTok(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ tokens: TokenSet; profile: Profile; scopes: string[] }> {
  const form = new URLSearchParams({
    client_key: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const tokenResult = await readProviderJson(
    await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    }),
    "TikTok",
  );
  const tokenData = tokenResult;
  const accessToken = getRequiredString(tokenData, "access_token");
  const userInfoUrl = new URL("https://open.tiktokapis.com/v2/user/info/");
  userInfoUrl.searchParams.set(
    "fields",
    "open_id,display_name,avatar_url",
  );
  const userResult = await readProviderJson(
    await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    "TikTok",
  );
  const userData = isRecord(userResult) ? userResult.data : undefined;
  const profileData = isRecord(userData) ? userData.user : undefined;
  const username =
    getString(profileData, "display_name") ??
    getRequiredString(tokenData, "open_id");

  return {
    tokens: {
      accessToken,
      refreshToken: getString(tokenData, "refresh_token"),
      expiresIn: Number(getString(tokenData, "expires_in")),
    },
    profile: {
      platformUserId: getRequiredString(tokenData, "open_id"),
      username,
      displayName: username,
      avatarUrl: getString(profileData, "avatar_url") ?? null,
    },
    scopes: ["user.info.basic"],
  };
}

async function connectYouTube(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ tokens: TokenSet; profile: Profile; scopes: string[] }> {
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const tokenResult = await readProviderJson(
    await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    }),
    "Google",
  );
  const accessToken = getRequiredString(tokenResult, "access_token");
  const channelUrl = new URL("https://youtube.googleapis.com/youtube/v3/channels");
  channelUrl.search = new URLSearchParams({
    part: "snippet",
    mine: "true",
  }).toString();
  const channelResult = await readProviderJson(
    await fetch(channelUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    "YouTube",
  );
  const items =
    isRecord(channelResult) && Array.isArray(channelResult.items)
      ? channelResult.items
      : [];
  const channel = items[0];
  const snippet = isRecord(channel) ? channel.snippet : undefined;
  const thumbnails = isRecord(snippet) ? snippet.thumbnails : undefined;
  const defaultThumbnail = isRecord(thumbnails)
    ? thumbnails.default
    : undefined;
  const title = getRequiredString(snippet, "title");
  const customUrl = getString(snippet, "customUrl");

  return {
    tokens: {
      accessToken,
      refreshToken: getString(tokenResult, "refresh_token"),
      expiresIn: Number(getString(tokenResult, "expires_in")),
    },
    profile: {
      platformUserId: getRequiredString(channel, "id"),
      username: customUrl ?? title,
      displayName: title,
      avatarUrl: getString(defaultThumbnail, "url") ?? null,
    },
    scopes: ["openid", "profile", "https://www.googleapis.com/auth/youtube.readonly"],
  };
}

async function connectPlatform(
  platform: SocialPlatform,
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
) {
  switch (platform) {
    case "instagram":
      return connectInstagram(code, clientId, clientSecret, redirectUri);
    case "tiktok":
      return connectTikTok(code, clientId, clientSecret, redirectUri);
    case "youtube":
      return connectYouTube(code, clientId, clientSecret, redirectUri);
  }
}

function redirectToHome(request: NextRequest, result: string) {
  const url = new URL("/", getAppUrl(request.url));
  url.searchParams.set("connection_error", result);
  return NextResponse.redirect(url);
}

function finishCookie(response: NextResponse, request: NextRequest, platform: SocialPlatform) {
  response.cookies.delete(getOAuthStateCookie(platform));
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!isSocialPlatform(params.platform)) {
    return NextResponse.json({ error: "Unsupported social platform." }, { status: 404 });
  }

  const platform = params.platform;
  const callbackState = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(getOAuthStateCookie(platform))?.value;
  if (!callbackState || !cookieState || callbackState !== cookieState) {
    return finishCookie(redirectToHome(request, "state"), request, platform);
  }

  if (request.nextUrl.searchParams.has("error")) {
    return finishCookie(redirectToHome(request, "denied"), request, platform);
  }

  const code = request.nextUrl.searchParams.get("code");
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!code || !sessionId) {
    return finishCookie(redirectToHome(request, "callback"), request, platform);
  }

  const { clientId, clientSecret } = getPlatformCredentials(platform);
  if (!clientId || !clientSecret) {
    return finishCookie(redirectToHome(request, "setup"), request, platform);
  }

  try {
    const redirectUri = getRedirectUri(platform, request.url);
    const result = await connectPlatform(
      platform,
      code,
      clientId,
      clientSecret,
      redirectUri,
    );
    const expiresAt = getExpiry(result.tokens.expiresIn);
    await saveConnectedAccount({
      sessionId,
      platform,
      ...result.profile,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      tokenExpiresAt: expiresAt,
      scopes: result.scopes,
    });

    const url = new URL("/", getAppUrl(request.url));
    url.searchParams.set("connected", platform);
    return finishCookie(NextResponse.redirect(url), request, platform);
  } catch (error) {
    console.error(`Unable to connect ${platform} account.`, error);
    return finishCookie(redirectToHome(request, "provider"), request, platform);
  }
}
