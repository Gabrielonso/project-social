export interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  open_id: string;
  scope: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
}

export interface TikTokUserInfo {
  user: {
    open_id: string;
    union_id: string;
    avatar_url: string;
    avatar_url_100: string;
    avatar_url_200: string;
    display_name: string;
    bio_description: string;
    profile_deep_link: string;
    is_verified: boolean;
    follower_count: number;
    following_count: number;
    likes_count: number;
    video_count: number;
  };
}
