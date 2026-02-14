/**
 * Keyterms for AssemblyAI streaming keytermsPrompt (when enabled via env).
 * Used to improve transcription accuracy for medications and common medical terms.
 */

/** Common medication names for keytermsPrompt. */
export const STREAMING_KEYTERMS_MEDICATIONS: readonly string[] = [
  "Atorvastatin calcium",
  "Amlodipine besylate",
  "Levothyroxine sodium",
  "Lisinopril",
  "Gabapentin",
  "Losartan potassium",
  "Omeprazole",
  "Amoxicillin",
  "Metformin",
  "Sertraline",
  "Albuterol sulfate",
  "Metoprolol succinate",
  "Rosuvastatin calcium",
  "Hydrocodone/acetaminophen",
  "Pantoprazole sodium",
  "Escitalopram oxalate",
  "Prednisone",
  "Trazodone",
  "Ibuprofen",
  "Hydrochlorothiazide",
];

/** Common medical terms for keytermsPrompt. */
export const STREAMING_KEYTERMS_MEDICAL_TERMS: readonly string[] = [
  "Abrasion",
  "Abscess",
  "Acute",
  "Benign",
  "Biopsy",
  "Chronic",
  "Contusion",
  "Defibrillator",
  "Edema",
  "Embolism",
  "Epidermis",
  "Fracture",
  "Gland",
  "Hypertension",
  "Inpatient",
  "Intravenous",
  "Malignant",
  "Outpatient",
  "Prognosis",
  "Relapse",
  "Sutures",
  "Transplant",
  "Vaccine",
];
