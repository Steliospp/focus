import React, { createContext, useContext } from "react";

type OnboardingContextValue = {
  resetOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useResetOnboarding() {
  const ctx = useContext(OnboardingContext);
  return ctx?.resetOnboarding ?? (async () => {});
}

export function OnboardingProvider({
  children,
  resetOnboarding,
}: {
  children: React.ReactNode;
  resetOnboarding: () => Promise<void>;
}) {
  return (
    <OnboardingContext.Provider value={{ resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}
