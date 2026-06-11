import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import crypto from "crypto";

export async function registerPatient(req: Request, res: Response) {
  try {
    const { name, email, password, address, dateOfBirth } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    // existing user check
    const existingUserCheck = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (existingUserCheck) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // creating an entry in user and patient table
    const user = await prisma.user.create({
  data: {
    name,
    email,
    passwordHash: hashedPassword,
    patient: {
      create: {
        address: address || "",
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    },
  },
  include: { patient: true },
});

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        username: user.name,
        email: user.email,
        address: user.patient?.address,
        dateOfBirth: user.patient?.dateOfBirth,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to register patient",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    if (hashedPassword !== user.passwordHash) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}