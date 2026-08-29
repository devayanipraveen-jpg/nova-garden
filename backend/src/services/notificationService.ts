import { prisma } from "../utils/prismaClient";
export const listNotifications=(userId:string,projectId:string)=>prisma.notification.findMany({where:{userId,projectId},orderBy:{createdAt:"desc"}});
export const markRead=(userId:string,id:string)=>prisma.notification.updateMany({where:{id,userId},data:{read:true}});
export const notify=(userId:string,title:string,body:string,projectId?:string)=>prisma.notification.create({data:{userId,title,body,projectId}});
