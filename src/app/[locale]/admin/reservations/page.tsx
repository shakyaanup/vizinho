import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("admin", "reservations");

export default function Page() {
  return <ComingSoon area="admin" section="reservations" phase={5} />;
}
