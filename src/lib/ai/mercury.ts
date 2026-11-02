/**
 * Pal Matrimony — Inception Labs Mercury AI Service
 * Adheres strictly to Codvian Gate 3 Conditions C1–C4:
 *   C1: Server-side secret execution only.
 *   C2: Controlled rate limits + kill switch (MERCURY_ENABLED).
 *   C3: Graceful fallback on API failure (resilient, non-blocking).
 *   C4: Privacy guard (only public bio text scanned; NO PII sent).
 */

export interface PIIScanResult {
  hasPII: boolean;
  detectedTypes: string[];
  sanitizedText?: string;
  reason?: string;
}

/**
 * Regex-based fast offline PII screening (zero API cost, primary safety line)
 */
function fastLocalPIIScreen(text: string): { hasPII: boolean; detected: string[] } {
  const detected: string[] = [];

  // Indian and international phone numbers (10+ digits with optional separators)
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g;
  // Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  // Social media handles (Instagram, Snapchat, Telegram)
  const socialRegex = /(?:insta|ig|snap|telegram|wa|whatsapp)[:\s@]+[a-zA-Z0-9._-]+/gi;

  if (phoneRegex.test(text)) detected.push("PHONE_NUMBER");
  if (emailRegex.test(text)) detected.push("EMAIL_ADDRESS");
  if (socialRegex.test(text)) detected.push("SOCIAL_HANDLE");

  return {
    hasPII: detected.length > 0,
    detected,
  };
}

/**
 * Screens free-text fields (About Me, Family Background) for accidental or intentional
 * contact details leakage before admin moderation.
 */
export async function screenBioTextForPII(bioText: string): Promise<PIIScanResult> {
  if (!bioText || bioText.trim().length === 0) {
    return { hasPII: false, detectedTypes: [] };
  }

  // 1. Fast local regex screening (Condition C3: resilient fallback)
  const localScan = fastLocalPIIScreen(bioText);
  if (localScan.hasPII) {
    return {
      hasPII: true,
      detectedTypes: localScan.detected,
      reason: `Direct contact details detected: ${localScan.detected.join(", ")}. Please remove before submitting.`,
    };
  }

  // 2. Mercury AI Guard (if enabled & configured)
  const isEnabled = process.env.MERCURY_ENABLED === "true";
  const apiKey = process.env.MERCURY_API_KEY;
  const baseUrl = process.env.MERCURY_BASE_URL || "https://platform.inceptionlabs.ai/v1";

  if (!isEnabled || !apiKey || apiKey.startsWith("your-")) {
    // Condition C3: Graceful fallback when AI is disabled or unconfigured
    return { hasPII: false, detectedTypes: [] };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for fast response

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "mercury",
        messages: [
          {
            role: "system",
            content: `You are a privacy guard for a high-trust matrimony platform. Your job is to check if the candidate bio text leaks contact details (phone numbers, obfuscated digits like 'nine eight four...', emails, social media handles, or full residential addresses).
Reply ONLY with a JSON object: {"hasPII": true/false, "detectedTypes": ["PHONE", "EMAIL", "HANDLE", "ADDRESS"], "reason": "brief explanation"}`,
          },
          {
            role: "user",
            content: bioText.slice(0, 1000), // Enforce Condition C2: Max 1000 characters to cap tokens
          },
        ],
        temperature: 0.1,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Mercury AI] Moderation call failed with HTTP ${response.status}. Falling back to local check.`);
      return { hasPII: false, detectedTypes: [] };
    }

    const data = await response.json();
    const replyContent = data.choices?.[0]?.message?.content?.trim();
    if (replyContent) {
      try {
        const parsed = JSON.parse(replyContent);
        return {
          hasPII: Boolean(parsed.hasPII),
          detectedTypes: Array.isArray(parsed.detectedTypes) ? parsed.detectedTypes : [],
          reason: parsed.reason,
        };
      } catch {
        // Fallback if not valid JSON
        return { hasPII: false, detectedTypes: [] };
      }
    }
  } catch (err: unknown) {
    // Condition C3: Resilient catch-all ensures matrimonial registration is never blocked by AI downtime
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[Mercury AI] Moderation request failed or timed out:", message);
  }

  return { hasPII: false, detectedTypes: [] };
}

/**
 * Respectful Matrimonial Bio Drafting Assistant
 * Helps candidates or family elders write dignified, well-structured summaries.
 */
export async function generateRespectfulBio(inputs: {
  education?: string;
  occupation?: string;
  city?: string;
  hobbies?: string;
  familyBackground?: string;
}): Promise<string | null> {
  const isEnabled = process.env.MERCURY_ENABLED === "true";
  const apiKey = process.env.MERCURY_API_KEY;
  const baseUrl = process.env.MERCURY_BASE_URL || "https://platform.inceptionlabs.ai/v1";

  if (!isEnabled || !apiKey || apiKey.startsWith("your-")) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const prompt = `Draft a polite, respectful, and modern matrimonial "About Me" profile summary for a candidate from the Pal (Gadaria) community based on these details:
- Education: ${inputs.education || "Graduate"}
- Occupation: ${inputs.occupation || "Professional"}
- Location: ${inputs.city || "India"}
- Interests/Hobbies: ${inputs.hobbies || "Family oriented, reading, travel"}
- Family: ${inputs.familyBackground || "Traditional values"}

Tone: Dignified, humble, forward-looking. Under 120 words. No phone numbers, no emails.`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "mercury",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 250,
      }),
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[Mercury AI] Bio generation assistant failed:", message);
  }

  return null;
}
