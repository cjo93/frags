import { z } from "zod";

const fidelityValues = ["LOW", "MEDIUM", "HIGH"] as const;
export const fidelityEnum = z.enum(fidelityValues);

export const familyRelationEnum = z.enum(["PARENT", "CHILD", "SIBLING", "PARTNER", "OTHER"]);

const birthDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Invalid date format" });

const optionalDateTime = z
  .string()
  .datetime()
  .or(z.string().refine((value) => !Number.isNaN(Date.parse(value)), { message: "Invalid datetime" }))
  .nullable()
  .optional();

export const birthDataSchema = z.object({
  date: birthDateSchema,
  time: z.string().optional(),
  tzIana: z.string().min(1),
  timeUtc: optionalDateTime,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  altitude: z.number().optional(),
  fidelity: fidelityEnum.optional()
});

export const profileCreateSchema = z.object({
  displayName: z.string().min(1).max(120),
  notes: z.string().optional(),
  birthData: birthDataSchema.optional()
});

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  notes: z.string().optional(),
  birthData: birthDataSchema.nullable().optional()
});

export const familyEdgeSchema = z.object({
  fromProfileId: z.string().cuid(),
  toProfileId: z.string().cuid(),
  relationType: familyRelationEnum,
  label: z.string().max(140).optional()
});

export function normalizeBirthData(payload: z.infer<typeof birthDataSchema>) {
  const { date, time, tzIana, timeUtc, latitude, longitude, altitude, fidelity } = payload;

  return {
    date: new Date(date),
    time,
    tzIana,
    timeUtc: timeUtc ? new Date(timeUtc) : null,
    latitude,
    longitude,
    altitude,
    fidelity: fidelity ?? "MEDIUM"
  };
}
