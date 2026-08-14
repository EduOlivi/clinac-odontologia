"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type LoginState } from "../actions";
import styles from "../admin.module.css";

/* ==========================================================================
   Formulário de login do painel
   ==========================================================================
   Este é o ÚNICO componente de cliente do backend, e mesmo assim ele não
   fala com o Supabase: só envia o formulário para a Server Action `signIn`.
   Nenhuma chave do Supabase existe no bundle do navegador — nem a `anon`.
   ========================================================================== */

const INITIAL: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.primaryButton} disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState(signIn, INITIAL);

  return (
    <form action={formAction} className={styles.loginCard}>
      <h1 className={styles.title}>Painel de leads</h1>
      <p className={styles.muted} style={{ marginBottom: 20 }}>
        Acesso restrito à equipe da Clínac.
      </p>

      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <label className={styles.field}>
        <span>E-mail</span>
        <input type="email" name="email" autoComplete="username" required />
      </label>

      <label className={styles.field}>
        <span>Senha</span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>

      <SubmitButton />
    </form>
  );
}
