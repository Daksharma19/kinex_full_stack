import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/token.ts";

const SALT_ROUNDS = 10;

export async function registerDoctor(req: Request, res: Response) {
  try {
    const { name, email, password, phone, specialization, licenseNumber } =
      req.body;
    if (!name || !email || !password || !specialization || !licenseNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }
    //existing doctor check
    const existingDoctorCheck = await prisma.user.findUnique({
      where: { email },
    });
    if (existingDoctorCheck) {
      return res.status(409).json({ message: "Doctor already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: "DOCTOR",
        phone: phone || "",
        doctor: {
          create: {
            specialization,
            licenseNumber,
          },
        },
      },
      include: {
        doctor: true,
      },
    });
    const token = generateToken({ id: user.id, role: user.role });
    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        username: user.name,
        email: user.email,
        role: user.role,
        licenseNumber: user.doctor?.licenseNumber,
        specialization: user.doctor?.specialization,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error registering doctor:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getDoctorById(req: Request, res: Response) {
    try {
        const doctorId = req.params.id;
        const doctor = await prisma.doctor.findUnique({
            where: { id: doctorId },
            include: {
                user: true,
            },
        });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }
        return res.status(200).json({ doctor });
    } catch (error) {
        console.error("Error fetching doctor:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

