import { compare, hash } from "bcryptjs";
import type { FastifyRequest, FastifyReply } from "fastify";

export type JwtPayload = {
  sub: number;
  email: string;
  role: "admin" | "page_developer" | "subscriber" | "blogger" | "blogger_admin";
  siteId: number | null;
};

export const hashPassword = (plain: string) => hash(plain, 10);
export const verifyPassword = (plain: string, hashed: string) => compare(plain, hashed);

export function requireAuth(roles: JwtPayload["role"][] = [], opts?: { globalOnly?: boolean }) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const user = req.user as JwtPayload;
    if (roles.length > 0 && !roles.includes(user.role)) {
      return reply.status(403).send({ error: "Forbidden" });
    }
    // Site-scoped users: block global-only routes and lock siteId
    if (user.siteId != null) {
      if (opts?.globalOnly) return reply.status(403).send({ error: "Forbidden" });
      req.siteId = user.siteId;
    }
  };
}
