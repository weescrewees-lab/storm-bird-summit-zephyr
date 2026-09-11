import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

export const savePlayerUsername = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => {
    if (typeof value !== "string") throw new Error("Username is required");
    const username = value.trim();
    if (!USERNAME_PATTERN.test(username)) {
      throw new Error("Username must be 3–24 characters: letters, numbers, or underscore.");
    }
    return username.toLowerCase();
  })
  .handler(async ({ data: username }) => {
    const sql = await getSql();
    await sql`
      insert into logistics_player_state (username)
      values (${username})
      on conflict (username) do update set updated_at = current_timestamp
    `;
    return { username };
  });
