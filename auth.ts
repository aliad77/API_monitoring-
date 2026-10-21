import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";

// Compared against when the email is unknown, so a failed login takes the same
// time whether or not the account exists.
const dummyHash = hashPassword("pulse-timing-equaliser");

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        const valid = await verifyPassword(
          parsed.data.password,
          user?.passwordHash ?? (await dummyHash),
        );
        if (!user || !valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
