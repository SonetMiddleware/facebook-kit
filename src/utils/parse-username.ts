import { isMobileFacebook } from './isMobile';

/**
 * @see https://www.facebook.com/help/105399436216001#What-are-the-guidelines-around-creating-a-custom-username?
 * ! Start to use this in a breaking change!
 */
export function isValidFacebookUsername(name: string) {
  if (!name) return null;
  // Avoid common mistake
  if (name === 'photo.php') return null;
  const n = name.toLowerCase().replace(/\./g, '');
  if (n.match(/^[a-z0-9]{5,}$/)) {
    return n;
  }
  return null;
}

/**
 * Normalize profile url
 */
export function getProfilePageUrlAtFacebook(user: any) {
  if (user.network !== 'facebook.com') throw new Error('Wrong origin');

  const host = getFacebookHostName();
  const username = user.userId;
  if (!isValidFacebookUsername(username)) throw new Error('invalid username');
  if (parseFloat(username)) return `${host}/profile.php?id=${username}`;
  return `${host}/${username}`;
}
export function getFacebookHostName() {
  if (isMobileFacebook) return 'https://m.facebook.com';
  return 'https://www.facebook.com';
}
