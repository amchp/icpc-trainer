import { bruteForce as enBruteForce } from "../locales/en/bruteForce.js";
import { bruteForce as esBruteForce } from "../locales/es/bruteForce.js";
import { i18n } from "./i18n.js";

if (!i18n.hasResourceBundle("en", "bruteForce")) {
  i18n.addResourceBundle("en", "bruteForce", enBruteForce, true, true);
}
if (!i18n.hasResourceBundle("es", "bruteForce")) {
  i18n.addResourceBundle("es", "bruteForce", esBruteForce, true, true);
}
