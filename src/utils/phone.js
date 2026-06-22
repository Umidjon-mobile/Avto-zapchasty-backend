function normalizePhone(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.startsWith('998')) {
    // ok
  } else if (d.length === 9) {
    d = '998' + d;
  } else if (d.startsWith('8') && d.length === 10) {
    d = '998' + d.slice(1);
  }
  return '+' + d;
}

function isValidUzPhone(phone) {
  return /^\+998\d{9}$/.test(phone);
}

module.exports = { normalizePhone, isValidUzPhone };
