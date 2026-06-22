export type CandidateGender = "male" | "female";

const FEMALE_FIRST_NAMES = new Set([
  "Aadhya", "Aanya", "Aarohi", "Aisha", "Ananya", "Anika", "Anjali", "Avni",
  "Divya", "Diya", "Ela", "Ira", "Ishita", "Kavya", "Kiara", "Kriti", "Lakshmi",
  "Meera", "Mira", "Myra", "Naina", "Neha", "Nisha", "Pari", "Pooja", "Priya",
  "Rhea", "Ritu", "Riya", "Saanvi", "Sana", "Shreya", "Siya", "Sneha", "Tanvi",
  "Tanya", "Tara", "Trisha", "Vidya", "Zara", "Aditi", "Anvi", "Disha", "Ishani",
  "Jiya", "Mahika", "Nandini", "Arya",
]);

const MALE_FIRST_NAMES = new Set([
  "Aarav", "Aditya", "Advaith", "Advik", "Amit", "Anil", "Arjun", "Arnav",
  "Aryan", "Atharv", "Ayaan", "Deepak", "Dev", "Dhruv", "Ishaan", "Jay", "Kabir",
  "Karan", "Krishna", "Manish", "Mohit", "Nikhil", "Om", "Pranav", "Rahul", "Raj",
  "Rajesh", "Reyansh", "Rohan", "Rudra", "Sahil", "Samir", "Sanjay", "Shaurya",
  "Shiv", "Siddharth", "Sunil", "Suresh", "Veer", "Vihaan", "Vikram", "Viraj",
  "Vivaan", "Yash", "Aadi", "Devansh", "Harsh", "Kunal", "Naveen", "Rishabh",
  "Tarun", "Varun", "Ved", "Arush", "Kartik", "Parth", "Raghav", "Sai",
]);

export function normalizeGender(
  value?: string | null
): CandidateGender | null {
  if (!value) return null;
  const g = value.trim().toLowerCase();
  if (g === "female" || g === "f" || g === "woman") return "female";
  if (g === "male" || g === "m" || g === "man") return "male";
  return null;
}

export function inferGenderFromName(name: string): CandidateGender | null {
  const first = name.trim().split(/\s+/)[0];
  if (!first) return null;
  const cap =
    first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  if (FEMALE_FIRST_NAMES.has(cap)) return "female";
  if (MALE_FIRST_NAMES.has(cap)) return "male";
  return null;
}

export function resolveCandidateGender(
  name: string,
  gender?: string | null
): CandidateGender | null {
  return normalizeGender(gender) ?? inferGenderFromName(name);
}