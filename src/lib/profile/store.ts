export interface FullProfile {
  id: string;
  publicId: string;
  userId: string;
  managedBy: string;
  firstName: string;
  gender: string;
  dob: string;
  age: number;
  heightCm?: number;
  maritalStatus: string;
  state: string;
  city: string;
  subCommunity?: string;
  publicationStatus: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "SUSPENDED";
  isDiscoverable: boolean;
  completionScore: number;
  // Details
  highestEducation?: string;
  educationDetail?: string;
  employedIn?: string;
  occupation?: string;
  annualIncomeRange?: string;
  motherTongue?: string;
  diet?: string;
  aboutMe?: string;
  // Family
  fatherOccupation?: string;
  motherOccupation?: string;
  brothersCount?: number;
  sistersCount?: number;
  familyType?: "NUCLEAR" | "JOINT";
  familyValues?: "TRADITIONAL" | "MODERATE" | "LIBERAL";
  familyLocation?: string;
  aboutFamily?: string;
  // Preferences
  prefMinAge?: number;
  prefMaxAge?: number;
  prefMinHeightCm?: number;
  prefMaxHeightCm?: number;
  prefMaritalStatus?: string[];
  prefStates?: string[];
  prefCities?: string[];
  // Photos
  photos?: Array<{ id: string; storageKey: string; visibility: string; moderationStatus: string; isPrimary?: boolean }>;
  // Family Managers
  managers?: Array<{
    id: string;
    relation: string;
    status: string;
    permissions: {
      canEditBiodata: boolean;
      canManagePreferences: boolean;
      canSendInterests: boolean;
      canViewShortlists: boolean;
      canDiscloseContact: boolean;
      canViewVerificationDocs: boolean;
    };
    createdAt?: string;
  }>;
}
