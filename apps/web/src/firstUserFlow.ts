import { appPaths } from "./appNavigation.js";

type RedirectLocation = Pick<Location, "pathname" | "search">;

export const isResourcesPath = (pathname: string): boolean =>
  pathname === appPaths.resources || pathname.startsWith(`${appPaths.resources}/`);

export const isAnimationsPath = (pathname: string): boolean =>
  pathname === appPaths.animations || pathname.startsWith(`${appPaths.animations}/`);

export const getFirstUserRedirectUrl = ({ pathname, search }: RedirectLocation): string =>
  isResourcesPath(pathname) || isAnimationsPath(pathname) ? `${pathname}${search}` : appPaths.root;
