/**
 * WhatsApp Message Formatter Utility
 * Generates formatted balance messages for different account types
 */

/**
 * Format balance message for WhatsApp
 * @param {Object} params - Message parameters
 * @param {string} params.accountType - Type of account (supplier, customer, saraf)
 * @param {number} params.currentBalance - Current account balance
 * @param {string} params.contactName - Name of the contact
 * @param {string} params.formattedBalance - Pre-formatted balance string with currency
 * @param {string} params.formattedDate - Pre-formatted date string
 * @param {string} params.companyName - Company name (optional)
 * @returns {string} Formatted WhatsApp message
 */
export const formatWhatsAppBalanceMessage = ({
  accountType,
  currentBalance,
  contactName,
  formattedBalance,
  formattedDate,
  companyName = 'بلال سدیس د مربا شرکت',
}) => {
  let balanceMessage = '';

  const currency = 'افغانۍ';

  if (accountType === 'supplier') {
    if (currentBalance > 0) {
      balanceMessage = `موږ ستاسی ${formattedBalance} ${currency} پوروړی یو`;
    } else if (currentBalance < 0) {
      balanceMessage = `موږ تاسو ته ${formattedBalance} ${currency} پور لرو`;
    } else {
      balanceMessage = 'ستاسو حساب صفر دی';
    }
  } else if (accountType === 'customer') {
    if (currentBalance > 0) {
      balanceMessage = `تاسی زموږ ${formattedBalance} ${currency} پوروړی یاست`;
    } else if (currentBalance < 0) {
      balanceMessage = `موږ تاسو ته ${formattedBalance} ${currency} پور لرو`;
    } else {
      balanceMessage = 'ستاسو حساب صفر دی';
    }
  } else if (accountType === 'saraf') {
    if (currentBalance < 0) {
      balanceMessage = `موږ تاسی ${formattedBalance} ${currency} پوروړی یو`;
    } else if (currentBalance > 0) {
      balanceMessage = `تاسی زموږ ${formattedBalance} ${currency} پوروړی یاست`;
    } else {
      balanceMessage = 'ستاسو حساب صفر دی';
    }
  }

  const line = '━'.repeat(10);

  const message = 
    `*${companyName}*\n` +
    `${line}\n\n` +
    `نوم: *${contactName}*\n\n` +
    `${balanceMessage}\n\n` +
    `${line}\n` +
    `نیټه: ${formattedDate}\n\n` +
    `مننه`;

  return message;
};

/**
 * Convert Persian/Pashto digits to English digits
 */
export const convertToEnglishDigits = (str) => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.split('').map(char => {
    const index = persianDigits.indexOf(char);
    return index !== -1 ? index.toString() : char;
  }).join('');
};

/**
 * Format phone number for WhatsApp
 */
export const formatWhatsAppPhone = (phone) => {
  let phoneNumber = convertToEnglishDigits(phone).replace(/[^0-9+]/g, '');
  
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+93' + phoneNumber;
  }

  return phoneNumber;
};

/**
 * Open WhatsApp with pre-filled message
 */
export const openWhatsApp = (phoneNumber, message) => {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
};
