/**
 * Pincode Helper — Centralized delivery logic for Indian pincodes.
 *
 * Previously this logic was duplicated in:
 *   - src/componets/page/Checkout.jsx
 *   - src/componets/page/ProductDetail.jsx
 *
 * Single source of truth — update here and it applies everywhere.
 */

const REMOTE_STATES = [
  'JAMMU & KASHMIR', 'JAMMU AND KASHMIR',
  'ANDAMAN & NICOBAR ISLANDS', 'ANDAMAN AND NICOBAR ISLANDS',
  'ANDAMAN AND NICOBAR',
  'LAKSHADWEEP',
  'JAMMU & KASHMIR STATE', 'J&K',
];

/**
 * Returns true if the pincode/state is in a remote route zone.
 * Remote routes incur a ₹80 surcharge and COD may be unavailable.
 */
export const isRemoteRoute = (pin, stateName = '') => {
  if (!pin) return false;
  const cleanedPin = String(pin).trim();
  const state = String(stateName).toUpperCase().trim();
  if (
    cleanedPin.startsWith('19') ||
    cleanedPin.startsWith('79') ||
    cleanedPin.startsWith('744')
  ) {
    return true;
  }
  if (REMOTE_STATES.includes(state)) {
    return true;
  }
  return false;
};

/**
 * Returns true if Cash on Delivery is available for the given pincode/state.
 */
export const isCodAvailableForPincode = (pin, stateName = '') => {
  return !isRemoteRoute(pin, stateName);
};

/**
 * Calculates estimated delivery details based on pincode and state.
 * Returns: { days, dateRange, desc, carrier }
 */
export const calculateDeliveryDetails = (pin, stateName = '') => {
  if (!pin) {
    return {
      days: '5-7 Days',
      dateRange: '',
      desc: 'Standard Delivery',
      carrier: 'India Post Speed Post',
    };
  }

  const state = String(stateName).toUpperCase().trim();
  const firstDigit = String(pin)[0];

  let minTransit, maxTransit, desc, carrier;

  if (pin === '395006') {
    minTransit = 0; maxTransit = 1;
    desc = 'Surat Warehouse Local Dispatch';
    carrier = 'Surat Local Express / Self Pickup';
  } else if (state === 'GUJARAT' || pin.startsWith('39')) {
    minTransit = 1; maxTransit = 2;
    desc = 'Gujarat Regional Delivery';
    carrier = 'Delhivery Express';
  } else if (
    ['MAHARASHTRA', 'RAJASTHAN', 'MADHYA PRADESH'].includes(state) ||
    firstDigit === '4' ||
    ['30', '31', '32', '33', '34'].some(prefix => pin.startsWith(prefix))
  ) {
    minTransit = 2; maxTransit = 3;
    desc = 'West/Central India Express Shipping';
    carrier = 'Delhivery Air';
  } else if (
    ['DELHI', 'HARYANA', 'PUNJAB', 'UTTAR PRADESH', 'KARNATAKA', 'TELANGANA', 'ANDHRA PRADESH', 'TAMIL NADU'].includes(state) ||
    ['1', '2', '5'].includes(firstDigit)
  ) {
    minTransit = 3; maxTransit = 4;
    desc = 'Metro Connect Express Delivery';
    carrier = 'Bluedart Air';
  } else if (['7', '8'].includes(firstDigit)) {
    minTransit = 4; maxTransit = 5;
    desc = 'East India Connect';
    carrier = 'Xpressbees Courier';
  } else {
    minTransit = 5; maxTransit = 7;
    desc = 'National Connect Remote Delivery';
    carrier = 'India Post Speed Post';
  }

  const today = new Date();
  const minDeliveryDate = new Date();
  minDeliveryDate.setDate(today.getDate() + 1 + minTransit);
  const maxDeliveryDate = new Date();
  maxDeliveryDate.setDate(today.getDate() + 2 + maxTransit);

  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  const dateRange = `${minDeliveryDate.toLocaleDateString('en-IN', options)} - ${maxDeliveryDate.toLocaleDateString('en-IN', options)}`;

  return {
    days: `${minTransit + 1}-${maxTransit + 2} Days`,
    dateRange,
    desc,
    carrier,
  };
};
