import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except static/data/api/_next assets. Keep this tight — every extra
  // path here adds runtime cost and dilutes the SSG-first strategy in docs/ARCHITECTURE.md.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
