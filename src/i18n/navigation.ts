import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware replacements for next/link and next/navigation.
// Always import Link/redirect/useRouter from here so URLs keep the locale prefix.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
