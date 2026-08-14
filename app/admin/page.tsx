import { redirect } from "next/navigation";

/** /admin não é uma tela: manda direto para a única que existe. */
export default function AdminIndex() {
  redirect("/admin/leads");
}
