import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().optional(),
  UPLOAD_STORAGE_PATH: z.string().default("./uploads"),
  MAX_UPLOAD_SIZE: z.coerce.number().int().positive().default(5_242_880),
  DEFAULT_CURRENCY: z.string().length(3).default("USD"),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export function getServerEnv() {
  return serverSchema.parse(process.env);
}

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
