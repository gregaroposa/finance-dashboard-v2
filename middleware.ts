import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protect everything under root (route group `(dashboard)` resolves to "/"),
// but allow auth pages to remain public to avoid redirect loops.
const isProtectedRoute = createRouteMatcher(["/"]); // matches all app routes

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
