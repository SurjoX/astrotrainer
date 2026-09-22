import rawMessier from "@/data/messier.json";
import { getConstellation } from "./catalog";

export type MessierType =
  | "Galaxy"
  | "Nebula"
  | "Open Cluster"
  | "Globular Cluster"
  | "Planetary Nebula"
  | "Other";

interface RawMessier {
  n: number;
  name: string | null;
  type: string;
  con: string;
  ra: string;
  dec: string;
  mag: number;
  size: string;
  ngc: string | null;
  aliases: string[];
  desc: string;
}

export interface MessierObject {
  id: string;
  number: number;
  designation: string;
  name: string | null;
  type: string;
  filterType: MessierType;
  constellationId: string;
  constellationName: string;
  ra: number;
  dec: number;
  magnitude: number;
  angularSize: string;
  ngc: string | null;
  aliases: string[];
  description: string;
}

function parseRa(value: string): number {
  const [hours = "0", minutes = "0"] = value.trim().split(/\s+/);
  return ((Number(hours) + Number(minutes) / 60) * 15 + 360) % 360;
}

function parseDec(value: string): number {
  const match = value.trim().match(/^([+-]?)(\d+)\s+(\d+(?:\.\d+)?)$/);
  if (!match) return Number(value);
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) + Number(match[3]) / 60);
}

function filterType(type: string): MessierType {
  if (type === "Galaxy") return "Galaxy";
  if (type === "Planetary Nebula") return "Planetary Nebula";
  if (type === "Globular Cluster") return "Globular Cluster";
  if (type.startsWith("Open Cluster")) return "Open Cluster";
  if (type === "Nebula") return "Nebula";
  return "Other";
}

export const messierObjects: MessierObject[] = (rawMessier as RawMessier[])
  .map((item) => {
    const constellation = getConstellation(item.con);
    return {
      id: `M${item.n}`,
      number: item.n,
      designation: `M${item.n}`,
      name: item.name,
      type: item.type,
      filterType: filterType(item.type),
      constellationId: item.con,
      constellationName: constellation?.name ?? item.con.toUpperCase(),
      ra: parseRa(item.ra),
      dec: parseDec(item.dec),
      magnitude: item.mag,
      angularSize: item.size,
      ngc: item.ngc,
      aliases: item.aliases,
      description: item.desc,
    } satisfies MessierObject;
  })
  .sort((a, b) => a.number - b.number);

const messierById = new Map(messierObjects.map((object) => [object.id, object]));

export function getMessier(id: string): MessierObject | undefined {
  const normalized = id.trim().toUpperCase().replace(/^M\s*/, "M");
  return messierById.get(normalized);
}

export function normalizeMessierAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/^m\s*(\d+)$/, "m$1");
}

export function matchesMessierAnswer(object: MessierObject, value: string): boolean {
  const answer = normalizeMessierAnswer(value);
  return [object.designation, object.name ?? "", ...object.aliases].some(
    (candidate) => normalizeMessierAnswer(candidate) === answer,
  );
}

export function searchMessier(query: string): MessierObject[] {
  const q = normalizeMessierAnswer(query);
  if (!q) return messierObjects;
  return messierObjects.filter((object) =>
    [
      object.designation,
      String(object.number),
      object.name ?? "",
      object.constellationName,
      object.constellationId,
      ...object.aliases,
    ].some((value) => normalizeMessierAnswer(value).includes(q)),
  );
}

export function randomMessier(excludeId?: string): MessierObject {
  const pool = messierObjects.filter((object) => object.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)] ?? messierObjects[0]!;
}

export function validateMessierData(): string[] {
  const errors: string[] = [];
  if (messierObjects.length !== 110) errors.push(`Expected 110 Messier objects, found ${messierObjects.length}`);
  const ids = new Set<string>();
  for (const object of messierObjects) {
    if (ids.has(object.id)) errors.push(`Duplicate Messier id: ${object.id}`);
    ids.add(object.id);
    if (object.number < 1 || object.number > 110) errors.push(`${object.id}: number out of range`);
    if (!(object.ra >= 0 && object.ra < 360)) errors.push(`${object.id}: RA out of range`);
    if (!(object.dec >= -90 && object.dec <= 90)) errors.push(`${object.id}: Dec out of range`);
    if (!getConstellation(object.constellationId)) errors.push(`${object.id}: unknown constellation ${object.constellationId}`);
  }
  for (let number = 1; number <= 110; number += 1) {
    if (!ids.has(`M${number}`)) errors.push(`Missing Messier id: M${number}`);
  }
  return errors;
}
