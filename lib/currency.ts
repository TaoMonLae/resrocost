export const SUPPORTED_CURRENCIES = [
  { code: "MYR", label: "Malaysian Ringgit", locale: "ms-MY" },
  { code: "USD", label: "US Dollar", locale: "en-US" },
  { code: "SGD", label: "Singapore Dollar", locale: "en-SG" },
  { code: "THB", label: "Thai Baht", locale: "th-TH" },
  { code: "IDR", label: "Indonesian Rupiah", locale: "id-ID" },
  { code: "PHP", label: "Philippine Peso", locale: "en-PH" },
  { code: "VND", label: "Vietnamese Dong", locale: "vi-VN" },
  { code: "CNY", label: "Chinese Yuan", locale: "zh-CN" },
  { code: "HKD", label: "Hong Kong Dollar", locale: "en-HK" },
  { code: "JPY", label: "Japanese Yen", locale: "ja-JP" },
  { code: "KRW", label: "South Korean Won", locale: "ko-KR" },
  { code: "AUD", label: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", label: "Canadian Dollar", locale: "en-CA" },
  { code: "EUR", label: "Euro", locale: "de-DE" },
  { code: "GBP", label: "British Pound", locale: "en-GB" },
  { code: "AED", label: "UAE Dirham", locale: "en-AE" },
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export function isSupportedCurrency(value: string): value is SupportedCurrencyCode {
  return SUPPORTED_CURRENCIES.some((currency) => currency.code === value);
}

export function getCurrencyLocale(currency: string) {
  return (
    SUPPORTED_CURRENCIES.find((item) => item.code === currency.toUpperCase())
      ?.locale ?? "en-US"
  );
}
