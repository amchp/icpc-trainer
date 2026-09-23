import { useAuth } from "@clerk/clerk-react";
import type { ReactNode } from "react";

import { SignInAction } from "./SignInAction.js";

export function LearningProgressAction({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { userId } = useAuth();
  return userId ? <>{children}</> : <SignInAction forProgress />;
}
