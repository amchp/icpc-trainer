export const judges = {
  title: "Judges",
  subtitle: "Connect or clear judge accounts",
  connectTitle: "Connect Judges",
  choose: "Choose a judge to connect",
  saveCredentials: "Save credentials for syncing {{judge}}",
  connected: "Connected",
  missing: "Missing",
  connectedJudges: "Connected Judges",
  connectJudge: "Connect judge",
  allConnected: "All connected",
  clear: "Clear",
  clearAll: "Clear all connected judges",
  clearError: "Could not clear {{judge}}",
  clearAllError: "Could not clear connected judges",
  handle: "Handle",
  apiKey: "API key",
  apiSecret: "API secret",
  enter: "Enter",
  back: "Back to provider selection",
  tutorial: "Setup tutorial",
  tutorialLabel: "Open {{judge}} setup tutorial",
  connectError: "Could not connect {{judge}}",
  serverUnavailable: "Could not reach the ICPC Trainer server. Make sure the local backend is running, then try connecting the judge again.",
  invalidCredentials: "The judge rejected these credentials. Check the entered values and try again.",
  connectionFailed: "Connection failed.",
  tutorialPage: {
    back: "QOJ connect",
    title: "Create a QOJ cookie credential",
    subtitle: "Use Chrome DevTools to copy your QOJ session cookie fields into ICPC Trainer.",
    openQoj: "Open QOJ",
    steps: {
      inspect: { title: "Open QOJ and inspect the page", description: "Sign in to QOJ with the account you want to sync. Right-click the page and choose Inspect.", alt: "QOJ home page with the browser context menu open on Inspect" },
      application: { title: "Switch to Application", description: "In Chrome DevTools, select the Application tab from the top toolbar.", alt: "Chrome DevTools open with the Application tab available" },
      cookies: { title: "Open the QOJ cookies", description: "In Storage, expand Cookies and select https://qoj.ac.", alt: "Chrome DevTools Application panel with Cookies selected in the Storage sidebar" },
      copy: { title: "Copy the cookie values", description: "Copy the Value column for the QOJ cookie rows into the matching fields in ICPC Trainer.", alt: "Chrome DevTools cookie table for QOJ with credential values redacted" }
    }
  }
} as const;
