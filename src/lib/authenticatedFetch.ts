import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export class SignInRequiredError extends Error {
  constructor(message = "Please sign in again to continue.") {
    super(message);
    this.name = "SignInRequiredError";
  }
}

let authReady: Promise<void> | null = null;

export function waitForFirebaseAuth(): Promise<void> {
  if (authReady) return authReady;
  authReady = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe();
      resolve();
    });
  });
  return authReady;
}

function authorizedInit(init: RequestInit, idToken: string): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${idToken}`);
  if (init.body instanceof FormData) headers.delete("Content-Type");
  return { ...init, headers };
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  await waitForFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new SignInRequiredError();

  let currentToken: string;
  try {
    currentToken = await user.getIdToken();
  } catch {
    throw new SignInRequiredError("Your session is unavailable. Please sign in again.");
  }
  let response = await fetch(input, authorizedInit(init, currentToken));
  if (response.status !== 401) return response;

  try {
    const refreshedToken = await user.getIdToken(true);
    response = await fetch(input, authorizedInit(init, refreshedToken));
    return response;
  } catch {
    throw new SignInRequiredError("Your session could not be refreshed. Please sign in again.");
  }
}
