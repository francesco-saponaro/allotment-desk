import { BadRequest } from "../../http";

export interface UpdateReleaseDto {
  released: number;
  note: string;
}

export function parseUpdateRelease(body: unknown): UpdateReleaseDto {
  if (typeof body !== "object" || body === null) BadRequest("a body with released and note is required");
  const { released, note } = body as Record<string, unknown>;
  if (typeof released !== "number" || !Number.isInteger(released) || released < 0 || released > 40) {
    BadRequest("released must be a whole number between 0 and 40");
  }
  return { released: released as number, note: typeof note === "string" ? note.trim() : "" };
}
