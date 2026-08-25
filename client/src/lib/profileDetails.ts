export type ProfileDetails = {
  bio: string;
  businessCategory: string;
  businessHours: string;
  address: string;
  website: string;
  contactEmail: string;
};

export function profileDetailsFromData(data: { [key in keyof ProfileDetails]?: string | null }): ProfileDetails {
  return {
    bio: data.bio ?? "",
    businessCategory: data.businessCategory ?? "",
    businessHours: data.businessHours ?? "",
    address: data.address ?? "",
    website: data.website ?? "",
    contactEmail: data.contactEmail ?? "",
  };
}

export function synchronizeProfileDetails(current: ProfileDetails, incoming: ProfileDetails, isEditing: boolean) {
  return isEditing ? current : incoming;
}
