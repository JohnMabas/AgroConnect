export interface UserProfileData {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  city_or_community: string | null;
  preferred_language: string;
  created_at: Date;
  updated_at: Date;
}
