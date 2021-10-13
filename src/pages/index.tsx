import { useState } from 'react';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../services/prismic';
import Post from './post/[slug]';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

function formatPosts(posts: Post[]): Post[] {
  const postsFormatted = posts.map(post => {
    return {
      ...post,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'd MMM yyyy',
        {
          locale: ptBR,
        }
      ),
    };
  });

  return postsFormatted;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const postsFormatted = formatPosts(postsPagination.results);

  const [posts, setPosts] = useState<Post[]>(postsFormatted);
  const [next_page, setNextPage] = useState(postsPagination.next_page);

  async function handleGetMorePosts(): Promise<void> {
    if (!next_page) {
      return;
    }

    const nextPage = await (await fetch(next_page)).json();
    const nextPosts = formatPosts(nextPage.results);

    setPosts([...posts, ...nextPosts]);
    setNextPage(nextPage);
  }

  return (
    <div className={commonStyles.container}>
      <main className={styles.content}>
        <img src="/Logo.svg" alt="logo" />
        <div className={styles.posts}>
          {posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a>
                <strong>{post.data.title}</strong>

                <p>{post.data.subtitle}</p>
                <div>
                  <time>
                    <FiCalendar size={20} />
                    {post.first_publication_date}
                  </time>
                  <span>
                    <FiUser size={20} />
                    {post.data.author}
                  </span>
                </div>
              </a>
            </Link>
          ))}
        </div>
        {postsPagination.next_page && (
          <button type="button" onClick={handleGetMorePosts}>
            Carregar mais posts
          </button>
        )}
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    Prismic.predicates.at('document.type', 'posts')
  );

  const results = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const postsPagination: PostPagination = {
    next_page: postsResponse.next_page,
    results,
  };

  return {
    props: {
      postsPagination,
    },
  };
};
