import { PostHog } from "posthog-node";
import process from "node:process";

let instance: PostHog | undefined;

export const getPostHog = (): PostHog | undefined => {
  if (instance !== undefined) return instance;
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return undefined;
  instance = new PostHog(apiKey, {
    host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
    enableExceptionAutocapture: true
  });
  return instance;
};

export const shutdownPostHog = async (): Promise<void> => {
  await instance?.shutdown();
};
