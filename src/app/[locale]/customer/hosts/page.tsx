import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("customer", "findHost");

export default function Page() {
  return <ComingSoon area="customer" section="findHost" phase={3} />;
}
