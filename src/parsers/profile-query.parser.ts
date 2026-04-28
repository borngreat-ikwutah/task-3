import type {
  ProfileFilters,
  PaginationOptions,
  SortOptions,
  AgeGroup,
} from "../repositories/profile.repository";

export type ParsedProfileQuery = {
  filters: ProfileFilters;
  pagination: PaginationOptions;
  sort: SortOptions;
};

type CountryEntry = {
  name: string;
  code: string;
};

const COUNTRY_MAP: CountryEntry[] = [
  { name: "nigeria", code: "NG" },
  { name: "ghana", code: "GH" },
  { name: "kenya", code: "KE" },
  { name: "uganda", code: "UG" },
  { name: "south africa", code: "ZA" },
  { name: "tanzania", code: "TZ" },
  { name: "ethiopia", code: "ET" },
  { name: "rwanda", code: "RW" },
  { name: "cameroon", code: "CM" },
  { name: "zambia", code: "ZM" },
  { name: "zimbabwe", code: "ZW" },
  { name: "senegal", code: "SN" },
  { name: "mali", code: "ML" },
  { name: "egypt", code: "EG" },
  { name: "canada", code: "CA" },
  { name: "united states", code: "US" },
  { name: "usa", code: "US" },
  { name: "america", code: "US" },
  { name: "united kingdom", code: "GB" },
  { name: "uk", code: "GB" },
  { name: "england", code: "GB" },
  { name: "france", code: "FR" },
  { name: "germany", code: "DE" },
  { name: "italy", code: "IT" },
  { name: "spain", code: "ES" },
  { name: "india", code: "IN" },
  { name: "china", code: "CN" },
  { name: "japan", code: "JP" },
  { name: "brazil", code: "BR" },
];

const MALE_WORDS = [
  "male",
  "males",
  "man",
  "men",
  "boy",
  "boys",
  "guy",
  "guys",
];

const FEMALE_WORDS = [
  "female",
  "females",
  "woman",
  "women",
  "girl",
  "girls",
  "lady",
  "ladies",
];

const YOUNG_AGE_RANGE = {
  minAge: 16,
  maxAge: 24,
};

function normalizeInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractCountry(input: string): string | undefined {
  for (const entry of COUNTRY_MAP) {
    const pattern = new RegExp(`\\b${escapeRegExp(entry.name)}\\b`, "i");
    if (pattern.test(input)) {
      return entry.code;
    }
  }

  return undefined;
}

function extractGender(input: string): "male" | "female" | undefined {
  let hasMale = false;
  let hasFemale = false;

  for (const word of MALE_WORDS) {
    if (new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(input)) {
      hasMale = true;
      break;
    }
  }

  for (const word of FEMALE_WORDS) {
    if (new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(input)) {
      hasFemale = true;
      break;
    }
  }

  if (hasMale && hasFemale) return undefined;
  if (hasMale) return "male";
  if (hasFemale) return "female";

  return undefined;
}

function extractAgeRange(input: string): {
  minAge?: number;
  maxAge?: number;
} {
  const result: { minAge?: number; maxAge?: number } = {};

  const aboveMatch = input.match(/\babove\s+(\d{1,3})\b/);
  if (aboveMatch?.[1]) result.minAge = Number(aboveMatch[1]);

  const overMatch = input.match(/\bover\s+(\d{1,3})\b/);
  if (overMatch?.[1]) result.minAge = Number(overMatch[1]);

  const underMatch = input.match(/\bunder\s+(\d{1,3})\b/);
  if (underMatch?.[1]) result.maxAge = Number(underMatch[1]);

  const belowMatch = input.match(/\bbelow\s+(\d{1,3})\b/);
  if (belowMatch?.[1]) result.maxAge = Number(belowMatch[1]);

  if (/\byoung\b/.test(input)) {
    result.minAge = YOUNG_AGE_RANGE.minAge;
    result.maxAge = YOUNG_AGE_RANGE.maxAge;
  }

  const ageRangeMatch = input.match(/\b(\d{1,3})\s*(?:-|to)\s*(\d{1,3})\b/);
  if (ageRangeMatch?.[1] && ageRangeMatch?.[2]) {
    const first = Number(ageRangeMatch[1]);
    const second = Number(ageRangeMatch[2]);

    if (!Number.isNaN(first) && !Number.isNaN(second)) {
      result.minAge = Math.min(first, second);
      result.maxAge = Math.max(first, second);
    }
  }

  return result;
}

function extractAgeGroup(input: string): AgeGroup | undefined {
  if (/\b(child|children|kid|kids)\b/.test(input)) return "child";
  if (/\b(teenager|teenagers|teen|teens)\b/.test(input)) return "teenager";
  if (/\b(adult|adults|grownup|grownups)\b/.test(input)) return "adult";
  if (/\b(senior|seniors|elderly|old)\b/.test(input)) return "senior";
  return undefined;
}

function extractPage(input: string): number | undefined {
  const match = input.match(/\bpage\s+(\d{1,4})\b/);
  return match?.[1] ? Number(match[1]) : undefined;
}

function extractLimit(input: string): number | undefined {
  const match = input.match(/\b(?:limit|per\s+page|show)\s+(\d{1,4})\b/);
  return match?.[1] ? Number(match[1]) : undefined;
}

function extractSort(input: string): SortOptions | undefined {
  if (/\b(age|oldest|youngest)\b/.test(input)) {
    return {
      sortBy: "age",
      sortOrder: /\b(oldest|desc|descending)\b/.test(input) ? "desc" : "asc",
    };
  }

  if (/\b(probability|gender probability|country probability)\b/.test(input)) {
    return {
      sortBy: "gender_probability",
      sortOrder: /\b(desc|descending|highest|top)\b/.test(input)
        ? "desc"
        : "asc",
    };
  }

  if (/\b(newest|latest|most recent|created)\b/.test(input)) {
    return {
      sortBy: "created_at",
      sortOrder: "desc",
    };
  }

  return undefined;
}

export function parseProfileQuery(
  input: string,
): ParsedProfileQuery & { isUninterpretable: boolean } {
  const normalized = normalizeInput(input);

  const gender = extractGender(normalized);
  const countryId = extractCountry(normalized);
  const ageGroup = extractAgeGroup(normalized);
  const ageRange = extractAgeRange(normalized);
  const page = extractPage(normalized);
  const limit = extractLimit(normalized);
  const sort = extractSort(normalized);

  const filters: ProfileFilters = {
    ...(gender ? { gender } : {}),
    ...(countryId ? { countryId } : {}),
    ...(ageGroup ? { ageGroup } : {}),
    ...(ageRange.minAge !== undefined ? { minAge: ageRange.minAge } : {}),
    ...(ageRange.maxAge !== undefined ? { maxAge: ageRange.maxAge } : {}),
  };

  const hasAnyMatch =
    gender !== undefined ||
    countryId !== undefined ||
    ageGroup !== undefined ||
    ageRange.minAge !== undefined ||
    ageRange.maxAge !== undefined ||
    page !== undefined ||
    limit !== undefined ||
    sort !== undefined;

  return {
    filters,
    pagination: {
      page: page ?? 1,
      limit: limit ?? 10,
    },
    sort: sort ?? { sortBy: "created_at", sortOrder: "desc" },
    isUninterpretable: !hasAnyMatch && input.trim().length > 0,
  };
}
