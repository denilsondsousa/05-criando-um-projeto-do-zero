import { NextApiRequest, NextApiResponse } from 'next';

export default (
  _: NextApiRequest,
  response: NextApiResponse
): Promise<void> => {
  response.clearPreviewData();

  response.writeHead(307, {
    location: '/',
  });

  response.end();

  return null;
};
