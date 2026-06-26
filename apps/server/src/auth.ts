import { createClerkClient, verifyToken } from "@clerk/backend";
import { upsertAppUser, type ApiContext } from "@icpc-trainer/api";
import type { DatabaseService } from "@icpc-trainer/db";
import type { IncomingMessage } from "node:http";

import type { ServerConfig } from "./config.js";

interface AuthDependencies {
  readonly config: ServerConfig["clerk"];
  readonly database: DatabaseService;
}

interface AuthenticatedUserProfile {
  readonly primaryEmail?: string | null;
  readonly displayName?: string | null;
  readonly imageUrl?: string | null;
}

const bearerToken = (value: string | undefined): string | undefined => {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
};

const headerValue = (value: string | readonly string[] | undefined): string | undefined => {
  if (typeof value === "string" || value === undefined) {
    return value;
  }
  return value[0];
};

const tokenFromConnectionParams = (value: unknown): string | undefined => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const token = (value as { readonly token?: unknown; readonly authToken?: unknown }).token ??
    (value as { readonly token?: unknown; readonly authToken?: unknown }).authToken;
  return typeof token === "string" && token.trim() !== "" ? token.trim() : undefined;
};

const clerkOptions = (config: ServerConfig["clerk"]) => ({
  secretKey: config.secretKey,
  publishableKey: config.publishableKey,
  jwtKey: config.jwtKey,
  authorizedParties: config.authorizedParties.length > 0 ? [...config.authorizedParties] : undefined
});

const clerkConfigured = (config: ServerConfig["clerk"]): boolean =>
  config.secretKey !== undefined || config.jwtKey !== undefined;

const clerkSecretConfigured = (config: ServerConfig["clerk"]): boolean =>
  config.secretKey !== undefined;

const baseUrl = (request: IncomingMessage): string => {
  const protocol = request.headers["x-forwarded-proto"]?.toString() ?? "http";
  const host = request.headers.host ?? "127.0.0.1";
  return `${protocol}://${host}${request.url ?? "/"}`;
};

const stringClaim = (claims: Record<string, unknown>, key: string): string | undefined => {
  const value = claims[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
};

const profileFromJwtClaims = (claims: Record<string, unknown>): AuthenticatedUserProfile => {
  const primaryEmail = stringClaim(claims, "email") ?? stringClaim(claims, "email_address");
  const name = stringClaim(claims, "name");
  const joinedName = [
    stringClaim(claims, "given_name"),
    stringClaim(claims, "family_name")
  ].filter((part): part is string => part !== undefined).join(" ");
  const displayName = name ?? (joinedName === "" ? undefined : joinedName);
  const imageUrl = stringClaim(claims, "picture") ?? stringClaim(claims, "image_url");

  return {
    primaryEmail,
    displayName,
    imageUrl
  };
};

const upsertAuthenticatedUser = (
  { database }: AuthDependencies,
  clerkUserId: string,
  profile: AuthenticatedUserProfile = {}
): Promise<ApiContext["appUser"]> =>
  upsertAppUser({ database }, {
    clerkUserId,
    primaryEmail: profile.primaryEmail,
    displayName: profile.displayName,
    imageUrl: profile.imageUrl
  });

const appUserFromBearerToken = async (
  dependencies: AuthDependencies,
  token: string
): Promise<ApiContext["appUser"]> => {
  if (!clerkConfigured(dependencies.config)) {
    return undefined;
  }

  try {
    const jwt = await verifyToken(token, clerkOptions(dependencies.config));
    const claims = jwt as Record<string, unknown>;
    const clerkUserId = stringClaim(claims, "sub");
    return clerkUserId === undefined
      ? undefined
      : await upsertAuthenticatedUser(dependencies, clerkUserId, profileFromJwtClaims(claims));
  } catch {
    return undefined;
  }
};

export const appUserFromHttpRequest = async (
  { config, database }: AuthDependencies,
  request: IncomingMessage
): Promise<ApiContext["appUser"]> => {
  const dependencies = { config, database };
  const token = bearerToken(headerValue(request.headers.authorization));
  if (token !== undefined) {
    return appUserFromBearerToken(dependencies, token);
  }

  if (!clerkSecretConfigured(config)) {
    return undefined;
  }

  try {
    const client = createClerkClient(clerkOptions(config));
    const authRequest = new Request(baseUrl(request), {
      method: request.method,
      headers: request.headers as HeadersInit
    });
    const auth = await client.authenticateRequest(authRequest, clerkOptions(config));

    if (!auth.isAuthenticated || auth.toAuth().userId === undefined) {
      return undefined;
    }

    const userId = auth.toAuth().userId;
    const user = await client.users.getUser(userId);

    return await upsertAuthenticatedUser(dependencies, userId, {
      primaryEmail: user.primaryEmailAddress?.emailAddress,
      displayName: user.fullName ?? user.username,
      imageUrl: user.imageUrl
    });
  } catch {
    return undefined;
  }
};

export const appUserFromConnectionParams = async (
  { config, database }: AuthDependencies,
  connectionParams: unknown
): Promise<ApiContext["appUser"]> => {
  if (!clerkConfigured(config)) {
    return undefined;
  }

  const token = tokenFromConnectionParams(connectionParams) ?? bearerToken(
    typeof connectionParams === "object" && connectionParams !== null
      ? (connectionParams as { readonly authorization?: string }).authorization
      : undefined
  );

  if (token === undefined) {
    return undefined;
  }

  return appUserFromBearerToken({ config, database }, token);
};
