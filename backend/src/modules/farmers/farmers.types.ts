export type FarmerVerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface FarmerProfileData {
  id: string;
  user_id: string;
  farm_name: string | null;
  farming_experience_years: number | null;
  farm_location: string | null;
  farm_size: number | null;
  farm_size_unit: string;
  primary_produce_interests: string[];
  farming_description: string | null;
  verification_status: FarmerVerificationStatus;
  cooperative_memberships?: Array<{
    cooperative_id: string;
    cooperative_name: string;
    status: string;
  }>;
  created_at: Date;
  updated_at: Date;
}
