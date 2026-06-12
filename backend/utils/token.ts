import jwt from "jsonwebtoken";

export function generateToken(user: { id: string; role: string }) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );
}