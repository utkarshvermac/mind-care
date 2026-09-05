"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { STORAGE_KEYS, readValue, writeValue } from "@/lib/storage"

export type Language = "en" | "hi" | "as"

export const LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "as", label: "Assamese", nativeLabel: "অসমীয়া" },
]

// Scope note: this covers the login/signup/auth flow, navigation, settings,
// and the caregiver-patient linking screens -- the parts of the app every
// user touches regardless of role. Game screens, the assistant's live chat
// replies, and chart labels stay in English for now; extend this dictionary
// with the same keys to cover them next.
const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    "brand.tagline": "Memory & cognitive wellness",
    "auth.loginHeadline": "Welcome back to MindCare.",
    "auth.loginSubtext": "Log in to continue your cognitive wellness journey, or check in on someone you care for.",
    "auth.securityNote": "Your data is private and securely stored.",
    "auth.welcomeBack": "Log in",
    "auth.loginPrompt": "Enter your email and password to continue.",
    "auth.newHereCreate": "New here? Create an account",
    "auth.orLogIn": "or log in",
    "auth.email": "Email",
    "auth.emailPlaceholder": "you@example.com",
    "auth.password": "Password",
    "auth.forgotPassword": "Forgot password?",
    "auth.hidePassword": "Hide password",
    "auth.showPassword": "Show password",
    "auth.logIn": "Log in",
    "auth.newHereQuestion": "Don't have an account yet?",
    "auth.createAccount": "Create one",
    "auth.serverUnreachable": "Could not reach the server. Please try again.",
    "auth.signupHeadline": "Join MindCare today.",
    "auth.signupSubtext": "Set up your account as a patient or a caregiver -- it only takes a minute.",
    "auth.createYourAccount": "Create your account",
    "auth.tellUsAboutYou": "Tell us a little about you.",
    "auth.fullName": "Full name",
    "auth.namePlaceholder": "Your name",
    "auth.confirmPassword": "Confirm password",
    "auth.passwordHint": "At least 6 characters",
    "auth.iAmA": "I am a",
    "auth.consentLabel": "I agree to share my activity data with my linked caregiver",
    "auth.consentHint": "You can change this anytime in Settings.",
    "auth.createAccountButton": "Create account",
    "auth.alreadyHaveAccount": "Already have an account?",
    "auth.logInLink": "Log in",
    "auth.forgotHeadline": "Reset your password",
    "auth.forgotSubtext": "Enter your email and we'll help you get back in.",
    "auth.sendResetLink": "Send reset link",
    "auth.backToLogin": "Back to log in",
    "auth.resetHeadline": "Choose a new password",
    "auth.newPassword": "New password",
    "auth.updatePassword": "Update password",
    "auth.devNoteToken": "No email service is set up for this demo -- use the token below directly.",
    "nav.dashboard": "Dashboard",
    "nav.games": "Cognitive Games",
    "nav.assistant": "Assistant",
    "nav.analytics": "Analytics",
    "nav.profile": "Profile",
    "nav.settings": "Settings",
    "nav.about": "About",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.loading": "Loading...",
    "common.language": "Language",
    "link.headline": "Link a patient to your account",
    "link.subtext": "Ask the patient to open their Profile page and share their invite code with you.",
    "link.codeLabel": "Invite code",
    "link.codePlaceholder": "e.g. AB12CD",
    "link.linkButton": "Link patient",
    "link.inviteCodeTitle": "Your invite code",
    "link.inviteCodeSubtext": "Share this code with your caregiver so they can link their account to yours.",
    "privacy.shareToggleLabel": "Share my activity data with my caregiver",
    "privacy.shareToggleHint": "When turned off, your linked caregiver will only see your name -- no scores, activity, or alerts.",
  },
  hi: {
    "brand.tagline": "याददाश्त और मानसिक स्वास्थ्य",
    "auth.loginHeadline": "MindCare में वापस स्वागत है।",
    "auth.loginSubtext": "अपनी यात्रा जारी रखने के लिए लॉग इन करें, या अपने किसी अपने की जानकारी देखें।",
    "auth.securityNote": "आपका डेटा निजी और सुरक्षित रूप से रखा जाता है।",
    "auth.welcomeBack": "लॉग इन करें",
    "auth.loginPrompt": "जारी रखने के लिए अपना ईमेल और पासवर्ड डालें।",
    "auth.newHereCreate": "नए हैं? खाता बनाएं",
    "auth.orLogIn": "या लॉग इन करें",
    "auth.email": "ईमेल",
    "auth.emailPlaceholder": "aapka@example.com",
    "auth.password": "पासवर्ड",
    "auth.forgotPassword": "पासवर्ड भूल गए?",
    "auth.hidePassword": "पासवर्ड छुपाएं",
    "auth.showPassword": "पासवर्ड दिखाएं",
    "auth.logIn": "लॉग इन करें",
    "auth.newHereQuestion": "अभी तक खाता नहीं है?",
    "auth.createAccount": "बनाएं",
    "auth.serverUnreachable": "सर्वर से संपर्क नहीं हो सका। कृपया फिर से कोशिश करें।",
    "auth.signupHeadline": "आज ही MindCare से जुड़ें।",
    "auth.signupSubtext": "मरीज़ या देखभालकर्ता के रूप में अपना खाता बनाएं -- बस एक मिनट लगेगा।",
    "auth.createYourAccount": "अपना खाता बनाएं",
    "auth.tellUsAboutYou": "हमें अपने बारे में थोड़ा बताएं।",
    "auth.fullName": "पूरा नाम",
    "auth.namePlaceholder": "आपका नाम",
    "auth.confirmPassword": "पासवर्ड दोबारा डालें",
    "auth.passwordHint": "कम से कम 6 अक्षर",
    "auth.iAmA": "मैं हूं एक",
    "auth.consentLabel": "मैं अपनी गतिविधि जानकारी अपने देखभालकर्ता के साथ साझा करने के लिए सहमत हूं",
    "auth.consentHint": "आप इसे सेटिंग्स में कभी भी बदल सकते हैं।",
    "auth.createAccountButton": "खाता बनाएं",
    "auth.alreadyHaveAccount": "पहले से खाता है?",
    "auth.logInLink": "लॉग इन करें",
    "auth.forgotHeadline": "पासवर्ड रीसेट करें",
    "auth.forgotSubtext": "अपना ईमेल डालें, हम आपकी मदद करेंगे।",
    "auth.sendResetLink": "रीसेट लिंक भेजें",
    "auth.backToLogin": "लॉग इन पर वापस जाएं",
    "auth.resetHeadline": "नया पासवर्ड चुनें",
    "auth.newPassword": "नया पासवर्ड",
    "auth.updatePassword": "पासवर्ड अपडेट करें",
    "auth.devNoteToken": "इस डेमो के लिए ईमेल सेवा सेट नहीं है -- नीचे दिए गए टोकन का सीधे उपयोग करें।",
    "nav.dashboard": "डैशबोर्ड",
    "nav.games": "कॉग्निटिव गेम्स",
    "nav.assistant": "सहायक",
    "nav.analytics": "एनालिटिक्स",
    "nav.profile": "प्रोफ़ाइल",
    "nav.settings": "सेटिंग्स",
    "nav.about": "जानकारी",
    "common.save": "सेव करें",
    "common.cancel": "रद्द करें",
    "common.loading": "लोड हो रहा है...",
    "common.language": "भाषा",
    "link.headline": "अपने खाते से मरीज़ को जोड़ें",
    "link.subtext": "मरीज़ से उनके प्रोफ़ाइल पेज पर जाकर अपना इनवाइट कोड साझा करने को कहें।",
    "link.codeLabel": "इनवाइट कोड",
    "link.codePlaceholder": "जैसे AB12CD",
    "link.linkButton": "मरीज़ को जोड़ें",
    "link.inviteCodeTitle": "आपका इनवाइट कोड",
    "link.inviteCodeSubtext": "यह कोड अपने देखभालकर्ता के साथ साझा करें ताकि वे अपना खाता आपसे जोड़ सकें।",
    "privacy.shareToggleLabel": "अपनी गतिविधि जानकारी देखभालकर्ता के साथ साझा करें",
    "privacy.shareToggleHint": "बंद करने पर, आपका देखभालकर्ता केवल आपका नाम देख पाएगा -- कोई स्कोर, गतिविधि या अलर्ट नहीं।",
  },
  as: {
    "brand.tagline": "স্মৃতি আৰু মানসিক সুস্থতা",
    "auth.loginHeadline": "MindCare লৈ পুনৰ স্বাগতম।",
    "auth.loginSubtext": "আপোনাৰ যাত্ৰা অব্যাহত ৰাখিবলৈ লগইন কৰক, বা আপুনি যত্ন লোৱা কাৰোবাৰ খবৰ চাওক।",
    "auth.securityNote": "আপোনাৰ তথ্য ব্যক্তিগত আৰু সুৰক্ষিতভাৱে ৰখা হয়।",
    "auth.welcomeBack": "লগইন কৰক",
    "auth.loginPrompt": "অব্যাহত ৰাখিবলৈ আপোনাৰ ইমেইল আৰু পাছৱৰ্ড দিয়ক।",
    "auth.newHereCreate": "নতুন? একাউণ্ট বনাওক",
    "auth.orLogIn": "বা লগইন কৰক",
    "auth.email": "ইমেইল",
    "auth.emailPlaceholder": "apunar@example.com",
    "auth.password": "পাছৱৰ্ড",
    "auth.forgotPassword": "পাছৱৰ্ড পাহৰিলে?",
    "auth.hidePassword": "পাছৱৰ্ড লুকুৱাওক",
    "auth.showPassword": "পাছৱৰ্ড দেখুৱাওক",
    "auth.logIn": "লগইন কৰক",
    "auth.newHereQuestion": "এতিয়াও একাউণ্ট নাই?",
    "auth.createAccount": "বনাওক",
    "auth.serverUnreachable": "চাৰ্ভাৰৰ সৈতে সংযোগ কৰিব পৰা নগ'ল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।",
    "auth.signupHeadline": "আজিয়েই MindCare ৰ সৈতে যোগ দিয়ক।",
    "auth.signupSubtext": "ৰোগী বা যত্নকাৰী হিচাপে আপোনাৰ একাউণ্ট বনাওক -- মাত্ৰ এক মিনিট লাগিব।",
    "auth.createYourAccount": "আপোনাৰ একাউণ্ট বনাওক",
    "auth.tellUsAboutYou": "আমাক আপোনাৰ বিষয়ে অলপ কওক।",
    "auth.fullName": "সম্পূৰ্ণ নাম",
    "auth.namePlaceholder": "আপোনাৰ নাম",
    "auth.confirmPassword": "পাছৱৰ্ড নিশ্চিত কৰক",
    "auth.passwordHint": "কমেও ৬টা আখৰ",
    "auth.iAmA": "মই এজন",
    "auth.consentLabel": "মই মোৰ কাৰ্যকলাপৰ তথ্য মোৰ যত্নকাৰীৰ সৈতে ভাগ-বতৰা কৰিবলৈ সন্মত",
    "auth.consentHint": "আপুনি এইটো যিকোনো সময়ত ছেটিংছত সলনি কৰিব পাৰে।",
    "auth.createAccountButton": "একাউণ্ট বনাওক",
    "auth.alreadyHaveAccount": "ইতিমধ্যে একাউণ্ট আছে?",
    "auth.logInLink": "লগইন কৰক",
    "auth.forgotHeadline": "পাছৱৰ্ড ৰিছেট কৰক",
    "auth.forgotSubtext": "আপোনাৰ ইমেইল দিয়ক, আমি আপোনাক সহায় কৰিম।",
    "auth.sendResetLink": "ৰিছেট লিংক পঠিয়াওক",
    "auth.backToLogin": "লগইনলৈ উভতি যাওক",
    "auth.resetHeadline": "নতুন পাছৱৰ্ড বাছক",
    "auth.newPassword": "নতুন পাছৱৰ্ড",
    "auth.updatePassword": "পাছৱৰ্ড আপডেট কৰক",
    "auth.devNoteToken": "এই ডেমোৰ বাবে ইমেইল সেৱা ছেট কৰা নাই -- তলৰ টোকেনটো পোনপটীয়াকৈ ব্যৱহাৰ কৰক।",
    "nav.dashboard": "ডেশ্ব'ৰ্ড",
    "nav.games": "কগনিটিভ গেম",
    "nav.assistant": "সহায়ক",
    "nav.analytics": "বিশ্লেষণ",
    "nav.profile": "প্ৰ'ফাইল",
    "nav.settings": "ছেটিংছ",
    "nav.about": "বিষয়ে",
    "common.save": "ছেভ কৰক",
    "common.cancel": "বাতিল কৰক",
    "common.loading": "ল'ড হৈ আছে...",
    "common.language": "ভাষা",
    "link.headline": "আপোনাৰ একাউণ্টত এজন ৰোগী সংযুক্ত কৰক",
    "link.subtext": "ৰোগীজনক তেওঁলোকৰ প্ৰ'ফাইল পৃষ্ঠাত গৈ আমন্ত্ৰণ ক'ড ভাগ-বতৰা কৰিবলৈ কওক।",
    "link.codeLabel": "আমন্ত্ৰণ ক'ড",
    "link.codePlaceholder": "যেনে AB12CD",
    "link.linkButton": "ৰোগী সংযুক্ত কৰক",
    "link.inviteCodeTitle": "আপোনাৰ আমন্ত্ৰণ ক'ড",
    "link.inviteCodeSubtext": "এই ক'ডটো আপোনাৰ যত্নকাৰীৰ সৈতে ভাগ-বতৰা কৰক যাতে তেওঁলোকে তেওঁলোকৰ একাউণ্ট আপোনাৰ সৈতে সংযুক্ত কৰিব পাৰে।",
    "privacy.shareToggleLabel": "মোৰ কাৰ্যকলাপৰ তথ্য মোৰ যত্নকাৰীৰ সৈতে ভাগ-বতৰা কৰক",
    "privacy.shareToggleHint": "বন্ধ কৰিলে, আপোনাৰ যত্নকাৰীয়ে কেৱল আপোনাৰ নাম দেখিব পাৰিব -- কোনো স্ক'ৰ, কাৰ্যকলাপ বা সতৰ্কবাণী নাই।",
  },
}

type I18nContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    const saved = readValue<Language | null>(STORAGE_KEYS.language, null)
    if (saved) setLanguageState(saved)
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    writeValue(STORAGE_KEYS.language, lang)
  }, [])

  const t = useCallback(
    (key: string) => dictionaries[language]?.[key] ?? dictionaries.en[key] ?? key,
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider")
  return ctx
}
