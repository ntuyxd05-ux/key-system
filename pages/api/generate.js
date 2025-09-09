export async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || req.ip || "0.0.0.0";

  // 🔒 rute admin saja
  if (
    path === "/admin" ||
    path.startsWith("/api/revoke") ||
    path.startsWith("/api/admins")
  ) {
    if (!(await checkBasicAuth(req))) return unauthorized();
    // (opsional) rate limit admin...
    return NextResponse.next();
  }

  // ✅ rute generate tidak butuh auth (boleh rate limit ringan)
  if (path.startsWith("/api/generate")) {
    // rate limit…
    return NextResponse.next();
  }

  // rute lain…
  return NextResponse.next();
}
