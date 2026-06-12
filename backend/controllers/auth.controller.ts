import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/token.ts";
const SALT_ROUNDS = 10;



export async function registerPatient(req: Request, res: Response) {
  try {
  const { name, email, password, address, phone,dateOfBirth } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // existing user check
    const existingUserCheck = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUserCheck) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // creating an entry in user and patient table
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: "PATIENT",
        phone: phone || "",
        patient: {
          create: {
            address: address || "",
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          },
        },
      },
      include: { patient: true },
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
        address: user.patient?.address,
        dateOfBirth: user.patient?.dateOfBirth,
        phone: user.phone,
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
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = generateToken({ id: user.id, role: user.role });

    return res.status(200).json({
      message: "Login successful",
      token,
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

export async function getMe(req:Request, res:Response) {
  const header = req.headers.authorization;
  if(!header) {
    return res.status(401).json({message:"Unauthorized"}) 
  }
  const token = header.split(" ")[1];
  try{
    const decoded = jwt.verify(token,process.env.JWT_SECRET as string) as {id:string, role:string};
    const user = await prisma.user.findUnique({
      where:{id:decoded.id}
    })
    if(!user){
      return res.status(404).json({message:"User not found"})
    }
    return res.status(200).json({user})
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}