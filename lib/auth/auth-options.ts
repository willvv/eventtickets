import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { OrgMember } from "@/models/OrgMember";
import { Role } from "@/types/roles";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _req) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await User.findOne({ email: credentials.email.toLowerCase() });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user._id.toString(), email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      await connectDB();
      const email = user.email?.toLowerCase();
      if (!email) return false;

      let dbUser = await User.findOne({ email });
      if (!dbUser) {
        // Auto-create customer accounts for Google sign-in
        if (account?.provider === "google") {
          dbUser = await User.create({
            email,
            name: user.name ?? email,
            image: user.image,
            role: Role.CUSTOMER,
            emailVerified: new Date(),
          });
        } else {
          // Magic-link: user must already exist (invited)
          return false;
        }
      }

      // Update image from Google on each sign-in
      if (account?.provider === "google" && user.image && dbUser.image !== user.image) {
        await User.updateOne({ _id: dbUser._id }, { image: user.image });
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        await connectDB();
        const dbUser = await User.findOne({ email: user.email?.toLowerCase() });
        if (!dbUser) return token;

        token.id = dbUser._id.toString();
        token.role = dbUser.role;

        // Resolve org membership (latest active org for org roles)
        if (
          dbUser.role === Role.ORG_ADMIN ||
          dbUser.role === Role.ORG_STAFF
        ) {
          const membership = await OrgMember.findOne({
            userId: dbUser._id,
            acceptedAt: { $exists: true },
          }).populate("orgId");
          if (membership) {
            token.orgId = (membership.orgId as any)._id.toString();
            token.orgSlug = (membership.orgId as any).slug;
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.orgId = token.orgId as string | undefined;
        session.user.orgSlug = token.orgSlug as string | undefined;
      }
      return session;
    },
  },
};
