import { animations as enAnimations } from "../locales/en/animations.js";
import { animations as esAnimations } from "../locales/es/animations.js";
import { i18n } from "./i18n.js";

if (!i18n.hasResourceBundle("en", "animations")) {
  i18n.addResourceBundle("en", "animations", enAnimations, true, true);
}
if (!i18n.hasResourceBundle("es", "animations")) {
  i18n.addResourceBundle("es", "animations", esAnimations, true, true);
}
