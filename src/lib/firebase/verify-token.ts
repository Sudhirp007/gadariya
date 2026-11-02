export interface VerifiedFirebaseUser {
  uid: string;
  phoneNumber?: string | null;
  email?: string | null;
  displayName?: string | null;
  emailVerified?: boolean;
}

/**
 * Server-side Firebase ID token verification.
 * Uses Google Identity Toolkit REST API (accounts:lookup) with API key.
 * Compatible with all Node and serverless runtimes without service-account files.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  if (!idToken || typeof idToken !== "string" || idToken.trim().length === 0) {
    throw new Error("Missing Firebase ID token");
  }

  // Support offline mock/test tokens in automated CI and test environments ONLY.
  // Gate behind NODE_ENV so this bypass can never be used against production
  // to impersonate an arbitrary verified phone number.
  const isNonProduction = process.env.NODE_ENV !== "production";
  if (isNonProduction && (idToken.startsWith("mock-phone-") || idToken.startsWith("test-token-"))) {
    const parts = idToken.split(":");
    const phone = parts[1] === "none" || parts[1] === "" ? undefined : (parts[1] || "+919876543210");
    const uid = parts[2] || (phone ? "mock-uid-" + phone.replace(/\D/g, "") : "mock-uid-google");
    return {
      uid,
      phoneNumber: phone,
      email: parts[3] || undefined,
      emailVerified: true,
    };
  }

  const apiKey =
    process.env.FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyAw1Z4iSgfFy_Xw0Eh--V4Gyj14BY_SakA";

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = "Invalid or expired Firebase authentication token";
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        message = `Firebase auth error: ${parsed.error.message}`;
      }
    } catch {
      // Keep fallback
    }
    throw new Error(message);
  }

  const data = await response.json();
  const user = data.users?.[0];

  if (!user) {
    throw new Error("No user found matching this Firebase ID token");
  }

  return {
    uid: user.localId,
    phoneNumber: user.phoneNumber || null,
    email: user.email || null,
    displayName: user.displayName || null,
    emailVerified: user.emailVerified ?? false,
  };
}
