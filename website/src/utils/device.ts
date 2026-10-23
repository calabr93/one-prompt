// Phones can't run the desktop app, so on a phone the site offers to send the link to a computer.
export function isPhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (uaData?.mobile) return true;
  return /Android.+Mobile|iPhone|iPod|Windows Phone/i.test(navigator.userAgent);
}
