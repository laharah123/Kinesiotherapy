import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { PRICING } from '@/lib/tokens';
import { useAuthStore, type Subscription } from '@/lib/store/auth';

const RC_API_KEY_IOS     = process.env.EXPO_PUBLIC_RC_API_KEY_IOS     ?? '';
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? '';

const API_KEY = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;

/** Store wording and deep links, per platform. */
export const STORE_NAME: string = Platform.select({
  ios: 'App Store',
  android: 'Google Play',
  default: 'your store',
});

export const MANAGE_SUBSCRIPTION_URL: string = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
});

// ─── Initialisation ────────────────────────────────────────────────────────────

/**
 * False when no RevenueCat key is set for this platform (dev builds, CI, and
 * anyone running the app without store credentials). Every call below is a
 * no-op in that case rather than throwing, and nothing grants access.
 */
export function isPurchasesConfigured(): boolean {
  return API_KEY.length > 0;
}

let configured = false;
let warned = false;

function warnOnce() {
  if (warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[revenuecat] No API key for this platform. Purchases are disabled; ' +
      'set EXPO_PUBLIC_RC_API_KEY_IOS / EXPO_PUBLIC_RC_API_KEY_ANDROID to enable them.',
  );
}

export function initRevenueCat(userId?: string) {
  if (!isPurchasesConfigured()) {
    warnOnce();
    return;
  }
  if (configured) return;

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  Purchases.configure({ apiKey: API_KEY, appUserID: userId ?? null });
  configured = true;
}

/**
 * Ties the RevenueCat customer to the Supabase user id, which is what the
 * webhook uses to find the row to update.
 */
export function identifyRevenueCatUser(userId: string) {
  if (!isPurchasesConfigured()) return;
  Purchases.logIn(userId).catch(() => {});
}

export function resetRevenueCatUser() {
  if (!isPurchasesConfigured()) return;
  Purchases.logOut().catch(() => {});
}

// ─── Offerings ────────────────────────────────────────────────────────────────

export async function fetchOffering(): Promise<PurchasesOffering | null> {
  if (!isPurchasesConfigured()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export interface Packages {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
}

/** Returns the monthly and yearly packages from the current offering. */
export async function fetchPackages(): Promise<Packages> {
  const offering = await fetchOffering();
  if (!offering) return { monthly: null, yearly: null };

  const monthly = offering.availablePackages.find(
    (p: PurchasesPackage) => p.product.identifier === PRICING.monthly.productId,
  ) ?? null;

  const yearly = offering.availablePackages.find(
    (p: PurchasesPackage) => p.product.identifier === PRICING.yearly.productId,
  ) ?? null;

  return { monthly, yearly };
}

// ─── Purchase ────────────────────────────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  customerInfo: CustomerInfo | null;
  cancelled: boolean;
  error: string | null;
}

const UNAVAILABLE = 'Purchases are not available right now.';

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  if (!isPurchasesConfigured()) {
    return { success: false, customerInfo: null, cancelled: false, error: UNAVAILABLE };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo, cancelled: false, error: null };
  } catch (err: unknown) {
    const e = err as { userCancelled?: boolean; message?: string };
    if (e.userCancelled) {
      return { success: false, customerInfo: null, cancelled: true, error: null };
    }
    return {
      success: false,
      customerInfo: null,
      cancelled: false,
      error: e.message ?? 'Purchase failed',
    };
  }
}

// ─── Restore ─────────────────────────────────────────────────────────────────

/** Null when purchases are unavailable or the restore failed. */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isPurchasesConfigured()) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

// ─── Entitlement check ────────────────────────────────────────────────────────

const ENTITLEMENT_ID = 'pro';

export function hasActiveEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
}

// ─── Customer info listener ───────────────────────────────────────────────────

type CustomerInfoListener = (info: CustomerInfo) => void;

export function addCustomerInfoListener(listener: CustomerInfoListener): () => void {
  if (!isPurchasesConfigured()) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isPurchasesConfigured()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

// ─── Subscription status helpers ──────────────────────────────────────────────

export interface SubscriptionStatus {
  isActive: boolean;
  planType: 'monthly' | 'yearly' | null;
  expiresAt: string | null;
}

export function extractSubscriptionStatus(
  customerInfo: CustomerInfo | null,
): SubscriptionStatus {
  const entitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID];

  if (!entitlement) {
    return { isActive: false, planType: null, expiresAt: null };
  }

  const productId = entitlement.productIdentifier;
  const planType: 'monthly' | 'yearly' | null =
    productId === PRICING.monthly.productId ? 'monthly' :
    productId === PRICING.yearly.productId  ? 'yearly'  : null;

  return {
    isActive: true,
    planType,
    expiresAt: entitlement.expirationDate ?? null,
  };
}

/**
 * Optimistically unlocks the UI after a purchase or restore.
 *
 * The subscriptions table is written by the RevenueCat webhook, which the client
 * cannot do any more; this only moves the local store forward so the user is not
 * staring at a paywall while the webhook lands. The next `fetchSubscription`
 * replaces it with the server row.
 *
 * Returns true when the customer actually holds the entitlement.
 */
export function applyCustomerInfoToStore(customerInfo: CustomerInfo | null): boolean {
  const status = extractSubscriptionStatus(customerInfo);
  if (!status.isActive) return false;

  const { subscription, setSubscription } = useAuthStore.getState();
  const next: Subscription = {
    id: subscription?.id ?? 'local',
    planType: status.planType,
    status: 'active',
    trialEndsAt: subscription?.trialEndsAt ?? null,
    currentPeriodEnds: status.expiresAt,
  };
  setSubscription(next);
  return true;
}
