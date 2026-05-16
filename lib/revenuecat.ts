import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'purchases-react-native';
import { Platform } from 'react-native';
import { PRICING } from '@/lib/tokens';

const RC_API_KEY_IOS     = process.env.EXPO_PUBLIC_RC_API_KEY_IOS     ?? '';
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? '';

// ─── Initialisation ────────────────────────────────────────────────────────────

export function initRevenueCat(userId?: string) {
  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  Purchases.configure({ apiKey, appUserID: userId ?? null });
}

export function identifyRevenueCatUser(userId: string) {
  Purchases.logIn(userId);
}

export function resetRevenueCatUser() {
  Purchases.logOut();
}

// ─── Offerings ────────────────────────────────────────────────────────────────

export async function fetchOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

/** Returns the monthly and yearly packages from the current offering. */
export async function fetchPackages(): Promise<{
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
}> {
  const offering = await fetchOffering();
  if (!offering) return { monthly: null, yearly: null };

  const monthly = offering.availablePackages.find(
    (p) => p.product.identifier === PRICING.monthly.productId,
  ) ?? null;

  const yearly = offering.availablePackages.find(
    (p) => p.product.identifier === PRICING.yearly.productId,
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

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
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

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

// ─── Entitlement check ────────────────────────────────────────────────────────

const ENTITLEMENT_ID = 'pro';

export function hasActiveEntitlement(customerInfo: CustomerInfo): boolean {
  return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
}

// ─── Customer info listener ───────────────────────────────────────────────────

type CustomerInfoListener = (info: CustomerInfo) => void;

export function addCustomerInfoListener(listener: CustomerInfoListener): () => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

// ─── Subscription status helpers ──────────────────────────────────────────────

export interface SubscriptionStatus {
  isActive: boolean;
  planType: 'monthly' | 'yearly' | null;
  expiresAt: string | null;
}

export function extractSubscriptionStatus(customerInfo: CustomerInfo): SubscriptionStatus {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

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
