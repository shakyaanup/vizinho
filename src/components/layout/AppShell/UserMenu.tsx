import { getCurrentProfile } from "@/lib/auth/profile";
import type { AppRole } from "@/lib/auth/roles";
import { UserMenuClient } from "./UserMenuClient";

/** Server half: loads the user, then hands plain data to the client menu. */
export async function UserMenu({ area }: { area: AppRole }) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <UserMenuClient
      area={area}
      name={profile.fullName}
      email={profile.email}
      roles={profile.roles}
    />
  );
}
