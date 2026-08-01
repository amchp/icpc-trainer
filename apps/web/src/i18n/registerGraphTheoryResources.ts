import { graphTheory as enGraphTheory } from "../locales/en/graphTheory.js";
import { graphTheory as esGraphTheory } from "../locales/es/graphTheory.js";
import { i18n } from "./i18n.js";

if (!i18n.hasResourceBundle("en", "graphTheory")) {
  i18n.addResourceBundle("en", "graphTheory", enGraphTheory, true, true);
}
if (!i18n.hasResourceBundle("es", "graphTheory")) {
  i18n.addResourceBundle("es", "graphTheory", esGraphTheory, true, true);
}
