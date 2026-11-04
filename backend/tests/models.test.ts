import {
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError,
} from "sequelize";
import { beforeAll, describe, expect, it } from "vitest";
import { Role, sequelize, User, UserRole } from "../src/database/models/index.js";
import { migrateAndSeedTestDatabase } from "./test-database.js";

describe("users, roles and user_roles", () => {
  beforeAll(async () => {
    await migrateAndSeedTestDatabase();
  });

  it("creates a user with only a phone number in E.164 format", async () => {
    const user = await User.create({
      phone_number: "08031234567",
    });

    expect(user.id).toBeTruthy();
    expect(user.phone_number).toBe("+2348031234567");
    expect(user.email).toBeNull();
    expect(user.status).toBe("pending");
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it("creates a user with only a normalized email address", async () => {
    const first = await User.create({
      email: "  Farmer@Example.COM ",
    });
    const second = await User.create({
      email: "buyer@example.com",
    });

    expect(first.email).toBe("farmer@example.com");
    expect(first.phone_number).toBeNull();
    expect(second.phone_number).toBeNull();
  });

  it("creates a user with both contact methods", async () => {
    const user = await User.create({
      display_name: "Both Contact",
      phone_number: "+2348031234568",
      email: "both@example.com",
    });

    expect(user.phone_number).toBe("+2348031234568");
    expect(user.email).toBe("both@example.com");
  });

  it("rejects a user without a phone number or email", async () => {
    await expect(
      User.create({ display_name: "No Contact" }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      sequelize.query(
        `INSERT INTO "users" ("display_name") VALUES ('Database Bypass')`,
      ),
    ).rejects.toBeTruthy();
  });

  it("rejects invalid phone numbers and email addresses", async () => {
    await expect(
      User.create({ phone_number: "not-a-phone" }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      User.create({ email: "not-an-email" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects duplicate phone numbers and email addresses", async () => {
    await User.create({ phone_number: "+2348031234569" });
    await expect(
      User.create({
        phone_number: "+2348031234569",
        email: "different@example.com",
      }),
    ).rejects.toBeInstanceOf(UniqueConstraintError);

    await User.create({ email: "duplicate@example.com" });
    await expect(
      User.create({
        phone_number: "+2348031234570",
        email: "duplicate@example.com",
      }),
    ).rejects.toBeInstanceOf(UniqueConstraintError);
  });

  it("seeds exactly the six initial roles", async () => {
    const roles = await Role.findAll({ order: [["name", "ASC"]] });

    expect(roles.map((role) => role.name)).toEqual([
      "admin",
      "buyer",
      "cooperative",
      "cooperative_agent",
      "farmer",
      "transporter",
    ]);
  });

  it("assigns a role to a user and prevents duplicate assignments", async () => {
    const user = await User.create({ email: "role-user@example.com" });
    const farmerRole = await Role.findOne({ where: { name: "farmer" } });

    expect(farmerRole).not.toBeNull();

    const assignment = await UserRole.create({
      user_id: user.id,
      role_id: farmerRole!.id,
    });

    expect(assignment.id).toBeTruthy();

    await expect(
      UserRole.create({
        user_id: user.id,
        role_id: farmerRole!.id,
      }),
    ).rejects.toBeInstanceOf(UniqueConstraintError);
  });

  it("rejects invalid foreign-key references", async () => {
    const user = await User.create({ email: "fk-user@example.com" });
    const farmerRole = await Role.findOne({ where: { name: "farmer" } });

    await expect(
      UserRole.create({
        user_id: "00000000-0000-4000-8000-000000000000",
        role_id: farmerRole!.id,
      }),
    ).rejects.toBeInstanceOf(ForeignKeyConstraintError);

    await expect(
      UserRole.create({
        user_id: user.id,
        role_id: "00000000-0000-4000-8000-000000000001",
      }),
    ).rejects.toBeInstanceOf(ForeignKeyConstraintError);
  });

  it("cascades user-role assignments when a user is deleted", async () => {
    const user = await User.create({ email: "cascade-user@example.com" });
    const buyerRole = await Role.findOne({ where: { name: "buyer" } });

    await UserRole.create({
      user_id: user.id,
      role_id: buyerRole!.id,
    });

    await user.destroy();

    const remaining = await UserRole.count({
      where: { user_id: user.id },
    });
    expect(remaining).toBe(0);
  });
});
