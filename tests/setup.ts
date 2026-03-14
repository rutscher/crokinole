import { beforeEach } from "vitest";
import { db } from "@/lib/db";

beforeEach(async () => {
  await db.disc.deleteMany();
  await db.round.deleteMany();
  await db.game.deleteMany();
  await db.player.deleteMany();
});
