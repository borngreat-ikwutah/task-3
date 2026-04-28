import { z } from "zod";

const genderizeSchema = z.object({
  name: z.string(),
  gender: z.union([z.literal("male"), z.literal("female"), z.null()]),
  probability: z.number(),
  count: z.number(),
});

const agifySchema = z.object({
  name: z.string(),
  age: z.number().nullable(),
  count: z.number(),
});

const nationalizeSchema = z.object({
  name: z.string(),
  country: z.array(
    z.object({
      country_id: z.string(),
      probability: z.number(),
    }),
  ),
});

export type GenderizeResult = z.infer<typeof genderizeSchema>;
export type AgifyResult = z.infer<typeof agifySchema>;
export type NationalizeResult = z.infer<typeof nationalizeSchema>;

export type ClassifiedCountry = {
  countryId: string;
  probability: number;
};

export type ExternalProfileData = {
  name: string;
  gender: "male" | "female";
  genderProbability: number;
  sampleSize: number;
  age: number;
  ageGroup: "child" | "teenager" | "adult" | "senior";
  countryId: string;
  countryName: string;
  countryProbability: number;
};

type ApiError = {
  status: "error";
  message: string;
  code: number;
};

function invalidResponseError(
  apiName: "Genderize" | "Agify" | "Nationalize",
): ApiError {
  return {
    status: "error",
    message: `${apiName} returned an invalid response`,
    code: 502,
  };
}

function timeoutError(
  apiName: "Genderize" | "Agify" | "Nationalize",
): ApiError {
  return {
    status: "error",
    message: `${apiName} returned an invalid response`,
    code: 502,
  };
}

async function fetchJson(
  url: string,
  apiName: "Genderize" | "Agify" | "Nationalize",
  timeoutMs = 2500,
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw timeoutError(apiName);
    }

    return await response.json();
  } catch {
    throw timeoutError(apiName);
  } finally {
    clearTimeout(timeoutId);
  }
}

function pickTopCountry(
  countries: NationalizeResult["country"],
): ClassifiedCountry | null {
  if (countries.length === 0) return null;

  const top = countries.reduce((best, current) => {
    return current.probability > best.probability ? current : best;
  });

  return {
    countryId: top.country_id,
    probability: top.probability,
  };
}

export function classifyAge(age: number): ExternalProfileData["ageGroup"] {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";
  return "senior";
}

export async function getGenderize(name: string): Promise<GenderizeResult> {
  const data = await fetchJson(
    `https://api.genderize.io?name=${encodeURIComponent(name)}`,
    "Genderize",
  );

  return genderizeSchema.parse(data);
}

export async function getAgify(name: string): Promise<AgifyResult> {
  const data = await fetchJson(
    `https://api.agify.io?name=${encodeURIComponent(name)}`,
    "Agify",
  );

  return agifySchema.parse(data);
}

export async function getNationalize(name: string): Promise<NationalizeResult> {
  const data = await fetchJson(
    `https://api.nationalize.io?name=${encodeURIComponent(name)}`,
    "Nationalize",
  );

  return nationalizeSchema.parse(data);
}

export async function buildExternalProfileData(
  name: string,
): Promise<ExternalProfileData> {
  const [genderize, agify, nationalize] = await Promise.all([
    getGenderize(name),
    getAgify(name),
    getNationalize(name),
  ]);

  if (genderize.gender === null || genderize.count === 0) {
    throw invalidResponseError("Genderize");
  }

  if (agify.age === null) {
    throw invalidResponseError("Agify");
  }

  const topCountry = pickTopCountry(nationalize.country);

  if (!topCountry) {
    throw invalidResponseError("Nationalize");
  }

  let countryName = topCountry.countryId;
  try {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    countryName = regionNames.of(topCountry.countryId) || topCountry.countryId;
  } catch (e) {
    // ignore
  }

  return {
    name: genderize.name,
    gender: genderize.gender,
    genderProbability: genderize.probability,
    sampleSize: genderize.count,
    age: agify.age,
    ageGroup: classifyAge(agify.age),
    countryId: topCountry.countryId,
    countryName,
    countryProbability: topCountry.probability,
  };
}
