import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./legal.module.css";

export default function LegalLayout({
  title,
  lastUpdated,
  warning,
  children,
  docNav,
  footerSecondaryLink,
}: {
  title: string;
  lastUpdated: string;
  warning: ReactNode;
  children: ReactNode;
  docNav: ReactNode;
  footerSecondaryLink: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo}>
            <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <path
                d="M13 4c-3 0-5 2-5 5.5 0 3 1.3 5.6 1.3 8.3 0 1.3.6 2.2 1.6 2.2.9 0 1.3-.7 1.6-2 .3-1.2.4-2.4 1-2.4s.7 1.2 1 2.4c.3 1.3.7 2 1.6 2 1 0 1.6-.9 1.6-2.2 0-2.7 1.3-5.3 1.3-8.3C18 6 16 4 13 4z"
                stroke="#0E3B2C"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            Clínac
          </Link>
          <Link href="/" className={styles.backLink}>
            ← Voltar ao site
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.wrap}>
          <div className={styles.docHead}>
            <div className={styles.eyebrow}>Legal</div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.docMeta}>{lastUpdated}</p>
          </div>

          <div className={styles.warn}>{warning}</div>

          <div className={styles.legalBody}>{children}</div>

          <div className={styles.docNav}>{docNav}</div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerWrap}>
          <span>© 2026 Clínac Odontologia. Todos os direitos reservados.</span>
          <span>
            <Link href="/">Clínac Odontologia</Link> · {footerSecondaryLink}
          </span>
        </div>
      </footer>
    </div>
  );
}
