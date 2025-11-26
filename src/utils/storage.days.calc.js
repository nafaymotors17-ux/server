exports.calculateStoragePeriod = (gateInDate, gateOutDate) => {
  if (!gateInDate) return "N/A";

  const inDate = new Date(gateInDate);
  const outDate = gateOutDate ? new Date(gateOutDate) : new Date();

  // Reset both dates to midnight to ignore hours
  inDate.setHours(0, 0, 0, 0);
  outDate.setHours(0, 0, 0, 0);

  if (outDate < inDate) return "0 days";

  const diffTime = outDate - inDate; // difference in milliseconds
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day

  return diffDays;
};
