import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("host", "earnings");

export default function Page() {
  return <ComingSoon area="host" section="earnings" phase={5} />;
}
