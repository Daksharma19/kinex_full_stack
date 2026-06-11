import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import crypto from "crypto";

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, address, dateOfBirth } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
      },
    });
    const newPatient = await prisma.patient.create({
      data: {
        userId: user.id,
        address: address || "",
        dateOfBirth: dateOfBirth || null,
      },
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        username: user.name,
        email: user.email,
        address: newPatient.address,
        dateOfBirth: newPatient.dateOfBirth,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error,
    });
  }
}
