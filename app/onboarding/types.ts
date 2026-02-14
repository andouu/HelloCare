export interface OnboardingFormData {
  firstName: string;
  lastName: string;
  language: string;
  phone: string;
}

export interface BaseStepProps {
  onContinue: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
}
