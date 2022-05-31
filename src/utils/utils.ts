import { getLocal } from '@soda/soda-core-ui'

export enum StorageKeys {
  FACEBOOK_ID = 'FACEBOOK_ID',
  WAITING_FACEBOOK_BINDING_POST = 'WAITING_FACEBOOK_BINDING_POST',
  FACEBOOK_BIND_RESULT = 'FACEBOOK_BIND_RESULT'
}

let facebookIdGlobal = ''
export const getFacebookId = async () => {
  if (!facebookIdGlobal) {
    const faceboodId = await getLocal(StorageKeys.FACEBOOK_ID)
    facebookIdGlobal = faceboodId
  }
  return facebookIdGlobal
}
