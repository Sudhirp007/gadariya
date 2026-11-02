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
  photos?: Array<{ id: string; storageKey: string; visibility: string; moderationStatus: string }>;
  // Family Managers
  managers?: Array<{ id: string; managerPhone: string; relation: string; permissions: Record<string, boolean> }>;
}

export const activeProfiles = new Map<string, FullProfile>();

if (activeProfiles.size === 0) {
  activeProfiles.set("default-user", {
    id: "prof-001",
    publicId: "PAL100001",
    userId: "default-user",
    managedBy: "SELF",
    firstName: "राजेश",
    gender: "MALE",
    dob: "1998-05-15",
    age: 28,
    heightCm: 175,
    maritalStatus: "NEVER_MARRIED",
    state: "Uttar Pradesh",
    city: "Agra",
    subCommunity: "पाल (धनगर)",
    publicationStatus: "PENDING_REVIEW",
    isDiscoverable: true,
    completionScore: 65,
    highestEducation: "B.Tech in Computer Science",
    educationDetail: "AKTU University",
    employedIn: "PRIVATE",
    occupation: "Software Engineer",
    annualIncomeRange: "₹10 Lakh - ₹15 Lakh",
    motherTongue: "Hindi",
    diet: "VEGETARIAN",
    aboutMe: "साधारण एवं संस्कारवान परिवार से। आधुनिक विचारों के साथ पारिवारिक मूल्यों में विश्वास।",
    fatherOccupation: "Government Employee (Retired)",
    motherOccupation: "Homemaker",
    brothersCount: 1,
    sistersCount: 1,
    familyType: "NUCLEAR",
    familyValues: "MODERATE",
    familyLocation: "Agra, Uttar Pradesh",
    aboutFamily: "पारिवारिक प्रतिष्ठा एवं उच्च नैतिक मूल्यों वाला परिवार।",
    prefMinAge: 23,
    prefMaxAge: 27,
    prefMinHeightCm: 155,
    prefMaxHeightCm: 170,
    prefMaritalStatus: ["NEVER_MARRIED"],
    prefStates: ["Uttar Pradesh", "Delhi-NCR", "Madhya Pradesh"],
    photos: [
      {
        id: "photo-01",
        storageKey: "photos/prof-001/primary.jpg",
        visibility: "APPROVAL_REQUIRED",
        moderationStatus: "APPROVED",
      },
    ],
    managers: [],
  });
}
