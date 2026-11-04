import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("admin", "incidents");

export default function Page() {
  return <ComingSoon area="admin" section="incidents" phase={5} />;
}
