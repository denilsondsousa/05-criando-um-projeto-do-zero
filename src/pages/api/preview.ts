import { Document } from '@prismicio/client/types/documents';
import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismicClient } from '../../services/prismic';

function linkResolver(doc: Document): string {
  if (doc.type === 'posts') {
    return `/post/${doc.uid}`;
  }
  return '/';
}

export default async (
  request: NextApiRequest,
  response: NextApiResponse
): Promise<void> => {
  const { token, documentID } = request.query;

  const prismic = getPrismicClient();

  const redirectUrl = await prismic
    .getPreviewResolver(String(token), String(documentID))
    .resolve(linkResolver, '/');

  if (!redirectUrl) {
    return response.status(401).json({ message: 'Invalid token' });
  }

  response.setPreviewData({ token });

  response.writeHead(302, {
    location: `${redirectUrl}`,
  });

  response.end();

  return null;
};
