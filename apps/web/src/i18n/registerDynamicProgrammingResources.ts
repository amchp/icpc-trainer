import { dynamicProgramming as enDynamicProgramming } from "../locales/en/dynamicProgramming.js";
import { dynamicProgramming as esDynamicProgramming } from "../locales/es/dynamicProgramming.js";
import { i18n } from "./i18n.js";

if (!i18n.hasResourceBundle("en", "dynamicProgramming")) i18n.addResourceBundle("en", "dynamicProgramming", enDynamicProgramming, true, true);
if (!i18n.hasResourceBundle("es", "dynamicProgramming")) i18n.addResourceBundle("es", "dynamicProgramming", esDynamicProgramming, true, true);
