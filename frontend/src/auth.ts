import { createContext, useContext } from "react";
import type { User } from "./types";
export const UserContext = createContext<User | null>(null);
export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("User context is required.");
  return user;
}
