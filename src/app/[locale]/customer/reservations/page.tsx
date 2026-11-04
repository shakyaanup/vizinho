import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("customer", "parcels");

export default function Page() {
  return <ComingSoon area="customer" section="parcels" phase={3} />;
}
