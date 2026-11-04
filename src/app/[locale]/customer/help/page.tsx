import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("customer", "help");

export default function Page() {
  return <ComingSoon area="customer" section="help" phase={5} />;
}
