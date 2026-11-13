import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { getMongoClient } from "@/lib/mongodb";
import { createRateLimiter } from "@/lib/rate-limit";
import { loginSchema, verifyCredentials } from "@/lib/users";

// 10 failed login attempts per email per 15 minutes (reset after a successful login)
const loginLimiter = createRateLimiter(10, 15 * 60_000);

export const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;
      if (!loginLimiter.check(parsed.data.email).ok) return null;
      const user = await verifyCredentials(parsed.data.email, parsed.data.password);
      if (!user) return null;
      loginLimiter.reset(parsed.data.email);
      return { id: user._id.toString(), name: user.name, email: user.email, image: user.image ?? null };
    },
  }),
];

if (googleEnabled) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(() => getMongoClient(), { databaseName: process.env.MONGODB_DB || "pixforge" }),
  // Credentials login requires JWT sessions; the adapter still stores Google users/accounts.
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
});

/** Safe session read: never crashes a page if auth is misconfigured. */
export async function getSession() {
  if (!process.env.AUTH_SECRET) return null; // auth not configured yet: everyone is a guest
  try {
    return await auth();
  } catch {
    return null;
  }
}
