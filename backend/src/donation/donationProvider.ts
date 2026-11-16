import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

export type DonationGateway = 'mock' | 'monobank_jar' | 'wayforpay' | 'liqpay';

export interface CreateDonationInput {
  amountUah: number;
  gateway: DonationGateway;
  auditId?: string;
}

export interface DonationCheckoutResult {
  donationId: string;
  gateway: DonationGateway;
  status: 'completed' | 'redirect_required';
  amountUah: number;
  currency: 'UAH';
  checkoutUrl?: string;
  gatewayPayload?: Record<string, string | number>;
  createdAt: string;
}

export interface DonationPaymentProvider {
  createDonation(input: CreateDonationInput): Promise<DonationCheckoutResult>;
}

/**
 * Builds a WayForPay checkout payload + HMAC-MD5 merchantSignature (for FOP/LLC checkout integration).
 */
export function buildWayForPayDonationPayload(
  orderReference: string,
  amountUah: number,
  merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT ?? 'test_merch_n1',
  merchantSecret = process.env.WAYFORPAY_SECRET_KEY ?? 'flk3409refn54t54t*FNJRET',
  merchantDomain = process.env.APP_DOMAIN ?? 'clauseguard.ua',
): Record<string, string | number> {
  const orderDate = Math.floor(Date.now() / 1000);
  const productName = 'ClauseGuard Voluntary Support';
  const productCount = 1;
  const productPrice = amountUah;
  const currency = 'UAH';

  const signSource = [
    merchantAccount,
    merchantDomain,
    orderReference,
    orderDate,
    amountUah,
    currency,
    productName,
    productCount,
    productPrice,
  ].join(';');

  const merchantSignature = crypto
    .createHmac('md5', merchantSecret)
    .update(signSource, 'utf-8')
    .digest('hex');

  return {
    merchantAccount,
    merchantDomainName: merchantDomain,
    orderReference,
    orderDate,
    amount: amountUah,
    currency,
    productName,
    productCount,
    productPrice,
    merchantSignature,
  };
}

/**
 * Builds a LiqPay base64 data + SHA1 signature checkout payload (PrivatBank acquiring).
 */
export function buildLiqPayDonationPayload(
  orderId: string,
  amountUah: number,
  publicKey = process.env.LIQPAY_PUBLIC_KEY ?? 'sandbox_public_key',
  privateKey = process.env.LIQPAY_PRIVATE_KEY ?? 'sandbox_private_key',
): { data: string; signature: string } {
  const payload = {
    version: 3,
    public_key: publicKey,
    action: 'pay',
    amount: amountUah,
    currency: 'UAH',
    description: 'ClauseGuard Voluntary Support',
    order_id: orderId,
  };

  const data = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
  const signature = crypto
    .createHash('sha1')
    .update(`${privateKey}${data}${privateKey}`, 'utf-8')
    .digest('base64');

  return { data, signature };
}

class ConfigurableDonationProvider implements DonationPaymentProvider {
  async createDonation(input: CreateDonationInput): Promise<DonationCheckoutResult> {
    const amountUah = Math.round(Number(input.amountUah));
    if (!Number.isFinite(amountUah) || amountUah < 10 || amountUah > 50000) {
      throw new Error('Donation amount must be between 10 and 50,000 UAH.');
    }

    const donationId = uuidv4();
    const createdAt = new Date().toISOString();

    if (input.gateway === 'monobank_jar') {
      return {
        donationId,
        gateway: 'monobank_jar',
        status: 'redirect_required',
        amountUah,
        currency: 'UAH',
        checkoutUrl: config.monobankJarUrl,
        createdAt,
      };
    }

    if (input.gateway === 'wayforpay') {
      return {
        donationId,
        gateway: 'wayforpay',
        status: 'redirect_required',
        amountUah,
        currency: 'UAH',
        checkoutUrl: 'https://secure.wayforpay.com/pay',
        gatewayPayload: buildWayForPayDonationPayload(donationId, amountUah),
        createdAt,
      };
    }

    if (input.gateway === 'liqpay') {
      const liqpay = buildLiqPayDonationPayload(donationId, amountUah);
      return {
        donationId,
        gateway: 'liqpay',
        status: 'redirect_required',
        amountUah,
        currency: 'UAH',
        checkoutUrl: 'https://www.liqpay.ua/api/3/checkout',
        gatewayPayload: liqpay,
        createdAt,
      };
    }

    // Default 'mock' gateway completes immediately for local demos & validation
    return {
      donationId,
      gateway: 'mock',
      status: 'completed',
      amountUah,
      currency: 'UAH',
      createdAt,
    };
  }
}

export const donationProvider: DonationPaymentProvider = new ConfigurableDonationProvider();
