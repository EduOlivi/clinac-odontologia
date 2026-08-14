"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateLeadStatus, type UpdateStatusState } from "../actions";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "../../lib/leads";
import styles from "../admin.module.css";

/* ==========================================================================
   Troca de status de um lead
   ==========================================================================
   Um <form> de verdade por linha, com <select> + botão. Sem salvamento
   automático ao trocar o <select>: numa tabela, é fácil demais mudar o
   status da linha errada ao rolar a página com o dedo, e não há histórico
   para desfazer. Um clique a mais é barato; corrigir "compareceu" gravado
   sem querer, não.
   ========================================================================== */

const INITIAL: UpdateStatusState = {};

function SaveButton({ current, disabled }: { current: LeadStatus; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-label={`Salvar status (atual: ${LEAD_STATUS_LABELS[current]})`}>
      {pending ? "…" : "Salvar"}
    </button>
  );
}

export default function StatusForm({ id, status }: { id: string; status: LeadStatus }) {
  const [state, formAction] = useActionState(updateLeadStatus, INITIAL);

  return (
    <form action={formAction} className={styles.statusForm}>
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status} aria-label="Status do lead">
        {LEAD_STATUSES.map((value) => (
          <option key={value} value={value}>
            {LEAD_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <SaveButton current={status} disabled={false} />
      {state.error ? (
        <span className={styles.muted} role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
