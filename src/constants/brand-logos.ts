import type { ImageSourcePropType } from 'react-native';

/**
 * Company logos. WaKira shows the brand's letter until a logo is added here.
 *
 * To add one:
 *   1. Put a square PNG (at least 128x128, transparent background) in assets/brands/, named as below.
 *   2. Remove the // in front of its line.
 *   3. Restart with: npx expo start -c
 * A line pointing to a file that does not exist stops the app from building, so only uncomment logos you added.
 * See assets/brands/README.txt for where to get official logo files.
 */
export const BRAND_LOGOS: Partial<Record<string, ImageSourcePropType>> = {
 'spaylater': require('../../assets/brands/spaylater.png'), // SPayLater
  // 'tiktok-paylater': require('../../assets/brands/tiktok-paylater.png'), // TikTok PayLater
 'atome': require('../../assets/brands/atome.png'), // Atome
 'grab-paylater': require('../../assets/brands/grab-paylater.png'), // Grab PayLater
  // 'lazada-paylater': require('../../assets/brands/lazada-paylater.png'), // Lazada PayLater
  // 'boost-payflex': require('../../assets/brands/boost-payflex.png'), // Boost PayFlex
  // 'ryt-paylater': require('../../assets/brands/ryt-paylater.png'), // Ryt PayLater
  // 'rhb-paylater': require('../../assets/brands/rhb-paylater.png'), // RHB PayLater
  // 'sloan': require('../../assets/brands/sloan.png'), // SLoan
  // 'tiktok-financing': require('../../assets/brands/tiktok-financing.png'), // TikTok Financing
  // 'aeon-credit': require('../../assets/brands/aeon-credit.png'), // AEON Credit
 'maybank': require('../../assets/brands/maybank.png'), // Maybank
 'cimb': require('../../assets/brands/cimb.png'), // CIMB
 'public-bank': require('../../assets/brands/public-bank.png'), // Public Bank
 'rhb': require('../../assets/brands/rhb.png'), // RHB
 'hong-leong': require('../../assets/brands/hong-leong.png'), // Hong Leong Bank
 'ambank': require('../../assets/brands/ambank.png'), // AmBank
 'bank-islam': require('../../assets/brands/bank-islam.png'), // Bank Islam
 'bank-rakyat': require('../../assets/brands/bank-rakyat.png'), // Bank Rakyat
 'bsn': require('../../assets/brands/bsn.png'), // BSN
 'affin': require('../../assets/brands/affin.png'), // Affin Bank
  // 'alliance': require('../../assets/brands/alliance.png'), // Alliance Bank
  // 'bank-muamalat': require('../../assets/brands/bank-muamalat.png'), // Bank Muamalat
  // 'mbsb': require('../../assets/brands/mbsb.png'), // MBSB Bank
  // 'agrobank': require('../../assets/brands/agrobank.png'), // Agrobank
  // 'ocbc': require('../../assets/brands/ocbc.png'), // OCBC
  // 'hsbc': require('../../assets/brands/hsbc.png'), // HSBC
  // 'uob': require('../../assets/brands/uob.png'), // UOB
  // 'standard-chartered': require('../../assets/brands/standard-chartered.png'), // Standard Chartered
  // 'gxbank': require('../../assets/brands/gxbank.png'), // GXBank
  // 'aeon-bank': require('../../assets/brands/aeon-bank.png'), // AEON Bank
  // 'boost-bank': require('../../assets/brands/boost-bank.png'), // Boost Bank
 'ryt-bank': require('../../assets/brands/ryt-bank.png'), // Ryt Bank
  // 'tng': require('../../assets/brands/tng.png'), // Touch 'n Go eWallet
  // 'grabpay': require('../../assets/brands/grabpay.png'), // GrabPay
  // 'boost': require('../../assets/brands/boost.png'), // Boost
  // 'shopeepay': require('../../assets/brands/shopeepay.png'), // ShopeePay
  // 'bigpay': require('../../assets/brands/bigpay.png'), // BigPay
  // 'setel': require('../../assets/brands/setel.png'), // Setel
  // 'mae': require('../../assets/brands/mae.png'), // MAE
};
