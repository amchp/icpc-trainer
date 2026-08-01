import { greedy as enGreedy } from "../locales/en/greedy.js";
import { greedy as esGreedy } from "../locales/es/greedy.js";
import { i18n } from "./i18n.js";

if (!i18n.hasResourceBundle("en", "greedy")) {
  i18n.addResourceBundle("en", "greedy", enGreedy, true, true);
}
if (!i18n.hasResourceBundle("es", "greedy")) {
  i18n.addResourceBundle("es", "greedy", esGreedy, true, true);
}
