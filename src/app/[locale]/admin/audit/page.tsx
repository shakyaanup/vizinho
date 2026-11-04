import { ComingSoon, comingSoonMetadata } from "@/components/layout/ComingSoon";

export const generateMetadata = comingSoonMetadata("admin", "audit");

export default function Page() {
  return <ComingSoon area="admin" section="audit" phase={5} />;
}
