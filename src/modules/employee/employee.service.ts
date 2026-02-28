import { prisma } from "@/lib/prisma";
import { encryptField } from "@/lib/security/crypto";
import { z } from "zod";

const createEmployeeSchema = z.object({
  orgId: z.string().min(1),
  departmentId: z.string().optional(),
  employeeCode: z.string().min(2),
  fullName: z.string().min(2),
  designation: z.string().min(2),
  salaryPlain: z.string().optional()
});

const updateEmployeeSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  fullName: z.string().min(2).optional(),
  designation: z.string().min(2).optional(),
  departmentId: z.string().min(1).nullable().optional(),
  salaryPlain: z.string().optional()
});

export class EmployeeService {
  async create(input: unknown) {
    const data = createEmployeeSchema.parse(input);
    return prisma.employee.create({
      data: {
        orgId: data.orgId,
        departmentId: data.departmentId,
        employeeCode: data.employeeCode,
        fullName: data.fullName,
        designation: data.designation,
        salaryEncrypted: data.salaryPlain ? encryptField(data.salaryPlain) : null
      }
    });
  }

  async list(orgId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await prisma.$transaction([
      prisma.employee.findMany({
        where: { orgId, isDeleted: false },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { department: { select: { id: true, name: true } } }
      }),
      prisma.employee.count({ where: { orgId, isDeleted: false } })
    ]);
    return { items, total, page, pageSize };
  }

  async update(input: unknown) {
    const data = updateEmployeeSchema.parse(input);
    return prisma.employee.update({
      where: { id: data.employeeId },
      data: {
        fullName: data.fullName,
        designation: data.designation,
        departmentId: data.departmentId,
        salaryEncrypted: data.salaryPlain ? encryptField(data.salaryPlain) : undefined
      }
    });
  }

  async softDelete(orgId: string, employeeId: string) {
    return prisma.employee.updateMany({
      where: { id: employeeId, orgId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }
}
