import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';

import Prismic from '@prismicio/client';
import Head from 'next/head';
import Link from 'next/link';

import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Comments from '../../components/Comments';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
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
  preview: boolean;
  nextPost: Post;
  prevPost: Post;
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
    last_publication_date: format(
      new Date(post.first_publication_date),
      "d MMM yyyy, 'às' H:s",
      {
        locale: ptBR,
      }
    ),
  };

  return postFormatted;
}

export default function Post({
  post,
  preview,
  nextPost,
  prevPost,
}: PostProps): JSX.Element {
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
          {postFormatted.last_publication_date && (
            <i>* editado em {postFormatted.last_publication_date}</i>
          )}
          <section>
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
          </section>
        </article>
        <div className={styles.footer}>
          <div className={styles.line} />
          <div className={styles.prevAndNextPosts}>
            <Link href={`/post/${prevPost?.uid}`}>
              <a className={!prevPost && `${styles.hiddenLinkPost}`}>
                <strong>{prevPost?.data.title}</strong>
                <span>Post Anterior</span>
              </a>
            </Link>
            <Link href={`/post/${nextPost?.uid}`}>
              <a className={!nextPost && `${styles.hiddenLinkPost}`}>
                <strong>{nextPost?.data.title}</strong>
                <span>Next Anterior</span>
              </a>
            </Link>
          </div>
          <Comments />
          {preview && (
            <button type="button" className={commonStyles.pewviewButton}>
              <Link href="/api/exit-preview">
                <a>Sair do modo preview.</a>
              </Link>
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    { pageSize: 10 }
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

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      orderings: '[document.first_publication_date]',
      after: response.id,
    }
  );

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      orderings: '[document.first_publication_date desc]',
      after: response.id,
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
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
      preview,
      nextPost: nextPost.results[0] ?? null,
      prevPost: prevPost.results[0] ?? null,
    },
    revalidate: 60 * 30, // 30 minutos
  };
};
