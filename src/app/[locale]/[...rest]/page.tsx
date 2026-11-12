import { notFound } from "next/navigation";

/**
 * One known path, so the static export (GitHub Pages) has a localized 404
 * page to copy to 404.html. With a server, every other unknown path still
 * renders here on demand.
 */
export function generateStaticParams() {
  return [{ rest: ["404"] }];
}

// Any unknown path inside a locale renders the localized 404 page.
export default function CatchAll() {
  notFound();
}
