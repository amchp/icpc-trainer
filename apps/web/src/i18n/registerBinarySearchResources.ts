import { binarySearch as enBinarySearch } from "../locales/en/binarySearch.js";
import { binarySearch as esBinarySearch } from "../locales/es/binarySearch.js";
import { i18n } from "./i18n.js";

if (!i18n.hasResourceBundle("en", "binarySearch")) {
  i18n.addResourceBundle("en", "binarySearch", enBinarySearch, true, true);
}
if (!i18n.hasResourceBundle("es", "binarySearch")) {
  i18n.addResourceBundle("es", "binarySearch", esBinarySearch, true, true);
}
