import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("host", "schedule");

export default function Page() {
  return <ComingSoon area="host" section="schedule" phase={2} />;
}
