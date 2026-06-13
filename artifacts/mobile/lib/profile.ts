import AsyncStorage from "@react-native-async-storage/async-storage";

// The founder's profile. Captured in onboarding, editable in Settings, and sent
// with every chat/council request so the advisors speak to the actual company.

export interface FounderProfile {
  name?: string;
  role?: string;
  startupName?: string;
  oneLiner?: string;
  stage?: string;
}

export const STARTUP_STAGES = [
  "Just an idea",
  "Pre-seed",
  "Seed",
  "Series A+",
  "Ramen profitable",
] as const;

const PROFILE_KEY = "costar_profile";
// Legacy key — the name was collected on its own before profiles existed.
const LEGACY_NAME_KEY = "costar_user_name";

export async function loadProfile(): Promise<FounderProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw) as FounderProfile;
    // Fall back to a previously-stored bare name so existing installs aren't blank.
    const name = await AsyncStorage.getItem(LEGACY_NAME_KEY);
    return name ? { name } : {};
  } catch {
    return {};
  }
}

export async function saveProfile(profile: FounderProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    // Keep the legacy name key in sync — the greeting still reads it directly.
    if (profile.name) {
      await AsyncStorage.setItem(LEGACY_NAME_KEY, profile.name);
    }
  } catch {}
}

export async function patchProfile(
  partial: Partial<FounderProfile>
): Promise<FounderProfile> {
  const current = await loadProfile();
  const next = { ...current, ...partial };
  await saveProfile(next);
  return next;
}

/** True when there's enough to make the advisors feel like they know the founder. */
export function hasStartupContext(p: FounderProfile): boolean {
  return Boolean(p.startupName || p.oneLiner);
}
