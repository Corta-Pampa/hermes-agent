// CORTA CUSTOMIZATION
// The product name main-process copy uses (tray, quit confirmation, native
// notification fallback). The upstream brand keeps its literal "Hermes" for
// every variant, exactly as before; a rebranded build names its own product.

import { PRODUCT_IDENTITY } from './product-identity'

export const BRAND_NAME: string =
  PRODUCT_IDENTITY.brand && PRODUCT_IDENTITY.brand !== 'hermes' ? PRODUCT_IDENTITY.displayName : 'Hermes'
