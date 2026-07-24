import { appPaths } from "./appNavigation.js";

type RedirectLocation = Pick<Location, "pathname" | "search">;

export const isResourcesPath = (pathname: string): boolean =>
  pathname === appPaths.resources || pathname.startsWith(`${appPaths.resources}/`);

export const getFirstUserRedirectUrl = ({ pathname, search }: RedirectLocation): string =>
  isResourcesPath(pathname) ? `${pathname}${search}` : appPaths.root;
