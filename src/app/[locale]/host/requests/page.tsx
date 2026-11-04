import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("host", "requests");

export default function Page() {
  return <ComingSoon area="host" section="requests" phase={3} />;
}
