import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("host", "storage");

export default function Page() {
  return <ComingSoon area="host" section="storage" phase={4} />;
}
