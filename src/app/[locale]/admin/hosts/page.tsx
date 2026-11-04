import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("admin", "hosts");

export default function Page() {
  return <ComingSoon area="admin" section="hosts" phase={2} />;
}
