import { NextRequest, NextResponse } from "next/server";
import {
  deleteConnectedAccount,
  getMissingSocialSetup,
  getOAuthStateCookie,
  getPlatformCredentials,
  getRedirectUri,
  isSocialPlatform,
  newOAuthState,
  newSessionId,
  SESSION_COOKIE,
} from "@/lib/social-connections";

type RouteContext = {
  params: { platform: string };
};

function getAuthorizationUrl(
  platform: "instagram" | "tiktok" | "youtube",
  clientId: string,
  redirectUri: string,
  state: string,
) {
  if (platform === "instagram") {
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "instagram_business_basic",
      state,
      enable_fb_login: "false",
    }).toString();
    return url;
  }

  if (platform === "tiktok") {
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.search = new URLSearchParams({
      client_key: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "user.info.basic",
      state,
    }).toString();
    return url;
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile https://www.googleapis.com/auth/youtube.readonly",
    state,
    access_type: "offline",
    prompt: "consent",
  }).toString();
  return url;
}

function errorRedirect(request: NextRequest, code: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("connection_error", code);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!isSocialPlatform(params.platform)) {
    return NextResponse.json({ error: "Unsupported social platform." }, { status: 404 });
  }

  const missing = getMissingSocialSetup(params.platform);
  if (missing.length > 0) {
    console.error("Social OAuth setup is incomplete.", {
      platform: params.platform,
      missing,
    });
    return errorRedirect(request, "setup");
  }

  const { clientId } = getPlatformCredentials(params.platform);
  if (!clientId) {
    return errorRedirect(request, "setup");
  }

  const state = newOAuthState();
  const stateCookie = getOAuthStateCookie(params.platform);
  const redirectUri = getRedirectUri(params.platform, request.url);
  const response = NextResponse.redirect(
    getAuthorizationUrl(params.platform, clientId, redirectUri, state),
  );
  const secure = new URL(redirectUri).protocol === "https:";
  response.cookies.set(
    SESSION_COOKIE,
    request.cookies.get(SESSION_COOKIE)?.value ?? newSessionId(),
    { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 },
  );
  response.cookies.set(stateCookie, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!isSocialPlatform(params.platform)) {
    return NextResponse.json({ error: "Unsupported social platform." }, { status: 404 });
  }

  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "No active Doppy session." }, { status: 401 });
  }

  try {
    const tokens = await deleteConnectedAccount(sessionId, params.platform);
    const providerRevoked = tokens
      ? await revokeProviderAccess(
          params.platform,
          tokens.accessToken,
          tokens.refreshToken,
        )
      : true;
    return NextResponse.json({ success: true, providerRevoked });
  } catch (error) {
    console.error("Unable to disconnect Doppy social account.", error);
    return NextResponse.json(
      { error: "Unable to remove the connected account." },
      { status: 503 },
    );
  }
}

async function revokeProviderAccess(
  platform: "instagram" | "tiktok" | "youtube",
  accessToken: string,
  refreshToken?: string,
) {
  try {
    let response: Response;
    if (platform === "instagram") {
      const url = new URL("https://graph.instagram.com/me/permissions");
      url.searchParams.set("access_token", accessToken);
      response = await fetch(url, { method: "DELETE", cache: "no-store" });
    } else if (platform === "tiktok") {
      const { clientId, clientSecret } = getPlatformCredentials(platform);
      if (!clientId || !clientSecret) return false;
      response = await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientId,
          client_secret: clientSecret,
          token: accessToken,
        }),
      });
    } else {
      response = await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refreshToken ?? accessToken }),
      });
    }

    if (!response.ok) {
      console.error("Social provider token revocation failed.", {
        platform,
        status: response.status,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("Could not revoke social provider access.", {
      platform,
      error,
    });
    return false;
  }
}
