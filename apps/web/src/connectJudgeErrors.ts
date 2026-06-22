const networkErrorPattern = /failed to fetch|fetch failed|networkerror|load failed/i;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const formatConnectJudgeError = (error: unknown): string => {
  const message = getErrorMessage(error);

  if (networkErrorPattern.test(message)) {
    return "Could not reach the ICPC Trainer server. Make sure the local backend is running, then try connecting the judge again.";
  }

  return message.trim() === "" ? "Connection failed." : message;
};
