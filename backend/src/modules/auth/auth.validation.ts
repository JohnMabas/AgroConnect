import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../../services/password.service.js";

// Shared field definitions
const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);

const phoneNumberField = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .max(32, "Phone number is too long.");

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email address is invalid.")
  .max(254, "Email address is too long.");

const displayNameField = z
  .string()
  .trim()
  .max(150, "Display name must be at most 150 characters.")
  .optional();

export const RegisterSchema = z
  .object({
    display_name: displayNameField,
    phone_number: phoneNumberField.optional(),
    email: emailField.optional(),
    password: passwordField,
    password_confirm: z.string(),
  })
  .refine(
    (data) =>
      data.phone_number !== undefined || data.email !== undefined,
    { message: "At least one of phone_number or email is required." },
  )
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords do not match.",
    path: ["password_confirm"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const VerifyPhoneSchema = z.object({
  user_id: z.string().uuid("Invalid user ID."),
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits.")
    .regex(/^\d{6}$/, "OTP must be exactly 6 digits."),
});

export type VerifyPhoneInput = z.infer<typeof VerifyPhoneSchema>;

export const ResendPhoneOtpSchema = z.object({
  user_id: z.string().uuid("Invalid user ID."),
});

export type ResendPhoneOtpInput = z.infer<typeof ResendPhoneOtpSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().trim().min(1, "Token is required."),
});

export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

export const ResendEmailVerificationSchema = z.object({
  user_id: z.string().uuid("Invalid user ID."),
});

export type ResendEmailVerificationInput = z.infer<typeof ResendEmailVerificationSchema>;

export const LoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Phone number or email is required.")
    .max(254),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof LoginSchema>;
