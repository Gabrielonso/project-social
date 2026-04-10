import { Axios } from 'axios';
import { oneSignalConfig } from 'src/config/one-signal.config';
import Logger from '../utils/Logger';
import { request } from '../utils/globals';

export interface OneSignalNotificationData {
  body: string;
  title: string;
  userId: string;
}

const getBearerToken = (token: string) => `Bearer ${token}`;

class OneSignal {
  private axios = new Axios({
    baseURL: oneSignalConfig.base_url,
    headers: {
      'Content-type': 'application/json',
      Authorization: 'Bearer ' + oneSignalConfig.api_key,
      'Content-Type': 'application/json',
    },
  });

  private defaultHeader = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  pushNotification = async (data: OneSignalNotificationData): Promise<any> => {
    try {
      const result = await request({
        ...this.defaultHeader,
        Authorization: getBearerToken(`${oneSignalConfig.api_key}`),
      })(
        `${oneSignalConfig.base_url}/notifications`,
        {
          app_id: oneSignalConfig.app_id,
          target_channel: 'push',
          contents: { en: data.body },
          headings: { en: data.title },
          include_aliases: { external_id: [data.userId] },
        },
        'POST',
      );

      console.log(result, '<==result one signal');

      return result;
    } catch (error) {
      console.log(error, '<<=error one signal');
      Logger.error(error).console();
      // throw new InternalServerErrorException(null, MESSAGES.PROCESSING_ERROR);
    }
  };
}

export default OneSignal;
