import Link from 'next/link';
import styles from './header.module.scss';

export default function Header(): JSX.Element {
  return (
    <Link href="/">
      <header className={styles.container}>
        <img src="/Logo.svg" alt="logo" />
      </header>
    </Link>
  );
}
