import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;

    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

function formatPost(post: Post): Post {
  const postFormatted = {
    ...post,
    first_publication_date: format(
      new Date(post.first_publication_date),
      'd MMM yyyy',
      {
        locale: ptBR,
      }
    ),
  };

  return postFormatted;
}

export default function Post({ post }: PostProps): JSX.Element {
  const postFormatted = formatPost(post);

  const amountWordsInBody = RichText.asText(
    post.data.content.reduce((acc, curr) => [...acc, ...curr.body], [])
  ).split(' ').length;

  const amountWordsInHeading = RichText.asText(
    post.data.content.reduce((acc, curr) => {
      if (curr.heading) {
        return [...acc, ...curr.heading.split(' ')];
      }
      return [...acc];
    }, [])
  ).length;

  const readingTime = Math.ceil(
    (amountWordsInHeading + amountWordsInBody) / 200
  );

  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <Head>
        <title>{postFormatted.data.title} | SpaceTravilling</title>
      </Head>
      <Header />
      <header className={styles.banner}>
        <img src={postFormatted.data.banner.url} alt={postFormatted.uid} />
      </header>

      <main className={commonStyles.container}>
        <article className={styles.content}>
          <strong className={styles.title}>{postFormatted.data.title}</strong>
          <div className={styles.info}>
            <span>
              <FiCalendar size={20} />
              {postFormatted.first_publication_date}
            </span>
            <span>
              <FiUser size={20} />
              {postFormatted.data.author}
            </span>
            <span>
              <FiClock size={20} />
              {readingTime} min
            </span>
          </div>

          {postFormatted.data.content.map(({ heading, body }) => (
            <div key={heading} className={styles.text}>
              {heading && <h3> {heading} </h3>}
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(body),
                }}
                className={styles.postContent}
              />
            </div>
          ))}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.predicates.at('document.type', 'posts')
  );

  return {
    paths: posts.results.map(post => {
      return {
        params: { slug: post.uid },
      };
    }),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prismic = getPrismicClient();

  const { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: { url: response.data.banner.url },
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30,
  };
};
