import { type Request, type Response } from "express";
import { prisma } from "../db.ts";
import { getAuthUser } from "../utils/auth.ts";

export async function listDoctorApplication(req:Request, res:Response) {
    try{
        const admin = getAuthUser(req);;
        if(!admin || admin.role !== "ADMIN"){
            return res.status(403).json({message:"Unauthorized"});
        }
        console.log(admin);
        const statusFilter = ((req.query.status as string) || "PENDING").toLowerCase();
        if(!["pending", "approved", "rejected"].includes(statusFilter)){
            return res.status(400).json({message:"Invalid status filter"});
        }
        const doctors = await prisma.doctor.findMany({
            where:{status:statusFilter.toUpperCase() },
            include: {user: {select :{name:true,email:true,phone:true}}},
            orderBy:{createdAt:"asc"}
        });
        return res.status(200).json({
            message:"Success",
            doctors
        })
    } catch(error) {
        console.error(error)
        res.status(500).json({
            message:"Internal Server Error"
        })
    }
}

export async function verifyDoctor(req:Request, res:Response) {
    try{
        const admin = getAuthUser(req);
        if(!admin || admin.role !== "ADMIN"){
            return res.status(403).json({
                message:"Unauthorized"
            })
        }
        const doctorId = req.params.id;
        const {status} = req.body;
        if(!["VERIFIED","REJECTED"].includes(status)){
            return res.status(400).json({
                message:"status must be VERIFIED or REJECTED"
            })
        }
        const doctor = await prisma.doctor.findUnique({
            where:{id:doctorId},
        });
        if(!doctor) {
            return res.status(404).json({
                message:"Doctor nor found"
            })
        }
        const updated = await prisma.doctor.update({
            where:{id:doctorId},
            data:{
                status,
                verifiedById:admin.id,
                verifiedAt: new Date()
            }
        });
        res.status(200).json({
            message:`Doctor ${status.toLowerCase()}`,
            doctor:updated
        });
    } catch(error) {
        console.error(error);
        return res.status(500).json({
            message:"Internal server error"
        });
    }
}