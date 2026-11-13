import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { getMongoClient } from "@/lib/mongodb";
import { loginSchema, verifyCredentials } from "@/lib/users";

export const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;
      const user = await verifyCredentials(parsed.data.email, parsed.data.password);
      if (!user) return null;
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
