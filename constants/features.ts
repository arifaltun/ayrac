// Uygulama genelindeki özellik anahtarları.
//
// MONETIZATION_ENABLED: Free/Pro ayrımının tamamı bu anahtarın arkasında uyur.
// false iken uygulama tüm özellikleriyle ücretsizdir: isPro her yerde true
// davranır, paywall hiçbir tetikleyiciden açılmaz, ayarlardaki Pro bölümü ve
// DEV Pro anahtarı gizlenir. Monetizasyon ileride yeniden değerlendirilirse
// bu anahtarı true yapmak yeterlidir — ProContext ve ProFeatureGate altyapısı
// olduğu gibi durur.
export const MONETIZATION_ENABLED = false;
