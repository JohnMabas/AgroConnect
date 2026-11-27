import { randomBytes } from "node:crypto";
import { Op } from "sequelize";
import "../src/config/env.js";
import { env } from "../src/config/env.js";
import {
  EmailVerificationToken,
  PhoneOtp,
  Role,
  User,
  UserPassword,
  UserRole,
  sequelize,
} from "../src/database/models/index.js";
import { hashPassword } from "../src/services/password.service.js";
import { normalizeEmail, normalizePhoneNumber } from "../src/utils/contact.js";

interface ScriptOptions {
  email: string | null;
  phone: string | null;
  password: string | null;
  name: string | null;
  allowAdditional: boolean;
  adoptExisting: boolean;
}

function parseArgs(argv: string[]): ScriptOptions {
  const values = new Map<string, string>();
  let allowAdditional = false;
  let adoptExisting = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!token.startsWith("--")) continue;
    if (token === "--allow-additional") {
      allowAdditional = true;
      continue;
    }
    if (token === "--adopt-existing") {
      adoptExisting = true;
      continue;
    }
    const [rawKey, inline] = token.slice(2).split("=", 2);
    if (!rawKey) continue;
    const value = inline ?? argv[index + 1];
    if (inline === undefined && value !== undefined && !value.startsWith("--")) {
      index += 1;
    }
    values.set(rawKey, value ?? "");
  }

  return {
    email: values.get("email") ?? process.env.ADMIN_EMAIL ?? null,
    phone: values.get("phone") ?? process.env.ADMIN_PHONE ?? null,
    password: values.get("password") ?? process.env.ADMIN_PASSWORD ?? null,
    name: values.get("name") ?? process.env.ADMIN_NAME ?? null,
    allowAdditional,
    adoptExisting,
  };
}

function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const email = options.email ? normalizeEmail(options.email) : null;
  const phone = options.phone
    ? normalizePhoneNumber(options.phone, env.DEFAULT_PHONE_COUNTRY)
    : null;

  if (!email && !phone) {
    throw new Error(
      "Provide --email and/or --phone (or ADMIN_EMAIL / ADMIN_PHONE).",
    );
  }

  const password = options.password ?? generatePassword();
  if (password.length < 8) {
    throw new Error("The administrator password must be at least 8 characters.");
  }

  const adminRole = await Role.findOne({ where: { name: "admin" } });
  if (!adminRole) {
    throw new Error(
      'The "admin" role is missing. Run the database seeders before creating an administrator.',
    );
  }

  const existingAdmin = await UserRole.findOne({
    where: { role_id: adminRole.id },
  });
  if (existingAdmin && !options.allowAdditional) {
    throw new Error(
      "An administrator already exists. Re-run with --allow-additional to create another.",
    );
  }

  const contactConditions = [];
  if (email) contactConditions.push({ email });
  if (phone) contactConditions.push({ phone_number: phone });

  const existingUser = await User.findOne({
    where: { [Op.or]: contactConditions },
  });
  if (existingUser && !options.adoptExisting) {
    throw new Error(
      "A user with that email or phone number already exists. Use the existing account instead, or re-run with --adopt-existing to grant it administrator access.",
    );
  }

  const displayName =
    options.name?.trim() ||
    (email ? email.split("@")[0] : null) ||
    "Platform Administrator";

  const user = await sequelize.transaction(async (transaction) => {
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const hash = await hashPassword(password);

    if (existingUser) {
      const passwordRecord = await UserPassword.findOne({
        where: { user_id: existingUser.id },
        transaction,
      });
      if (passwordRecord) {
        throw new Error(
          "That account already has a password. Use the password reset flow instead.",
        );
      }

      if (options.name?.trim()) {
        existingUser.display_name = options.name.trim();
      }
      existingUser.status = "active";
      await existingUser.save({ transaction });

      await UserPassword.create(
        { user_id: existingUser.id, hash },
        { transaction },
      );
      await UserRole.create(
        { user_id: existingUser.id, role_id: adminRole.id },
        { transaction },
      );

      // Login requires at least one used verification token per contact.
      if (email) {
        const verifiedEmails = await EmailVerificationToken.count({
          where: { user_id: existingUser.id, used: true },
          transaction,
        });
        if (verifiedEmails === 0) {
          await EmailVerificationToken.create(
            {
              user_id: existingUser.id,
              email,
              token_hash: randomBytes(32).toString("hex"),
              expires_at: expiresAt,
              used: true,
            },
            { transaction },
          );
        }
      }
      if (phone) {
        const usedOtps = await PhoneOtp.count({
          where: { user_id: existingUser.id, used: true },
          transaction,
        });
        if (usedOtps === 0) {
          await PhoneOtp.create(
            {
              user_id: existingUser.id,
              otp_hash: randomBytes(32).toString("hex"),
              expires_at: expiresAt,
              used: true,
            },
            { transaction },
          );
        }
      }

      return existingUser;
    }

    const created = await User.create(
      {
        display_name: displayName,
        email,
        phone_number: phone,
        status: "active",
      },
      { transaction },
    );

    await UserPassword.create(
      { user_id: created.id, hash },
      { transaction },
    );
    await UserRole.create(
      { user_id: created.id, role_id: adminRole.id },
      { transaction },
    );

    if (email) {
      await EmailVerificationToken.create(
        {
          user_id: created.id,
          email,
          token_hash: randomBytes(32).toString("hex"),
          expires_at: expiresAt,
          used: true,
        },
        { transaction },
      );
    }

    if (phone) {
      await PhoneOtp.create(
        {
          user_id: created.id,
          otp_hash: randomBytes(32).toString("hex"),
          expires_at: expiresAt,
          used: true,
        },
        { transaction },
      );
    }

    return created;
  });

  console.log(
    existingUser
      ? "Existing account promoted to administrator."
      : "Administrator created successfully.",
  );
  console.log(`  User ID:  ${user.id}`);
  if (email) console.log(`  Email:    ${email}`);
  if (phone) console.log(`  Phone:    ${phone}`);
  if (!options.password) {
    console.log(`  Password: ${password}`);
    console.log("Store this password securely; it will not be shown again.");
  }
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error && error.message
        ? error.message
        : String(error ?? "Failed to create administrator.");
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
