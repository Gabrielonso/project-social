export interface UserDisplay {
  userId: string;
  username: string;
  profilePicture?: string;
}

/** Public user identity attached to API responses. */
export interface UserDisplayDto {
  id: string;
  username: string;
  profilePicture?: string;
}
