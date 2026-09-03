// Service worker served by src/app/serwist/[path]/route.ts. The scope stays
// "/" (the route sends Service-Worker-Allowed: /) so the registration created
// by the former /sw.js — and its push subscription — is updated in place.
export const SW_URL = "/serwist/sw.js";
export const SW_SCOPE = "/";
