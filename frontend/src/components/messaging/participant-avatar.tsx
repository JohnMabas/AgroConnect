import { initials } from "@/lib/messaging";

interface ParticipantAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

const SIZES: Record<NonNullable<ParticipantAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-11 w-11 text-sm",
};

export function ParticipantAvatar({ name, size = "md" }: ParticipantAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-agro-green/12 font-heading font-extrabold text-agro-green ${SIZES[size]}`}
    >
      {initials(name)}
    </span>
  );
}
