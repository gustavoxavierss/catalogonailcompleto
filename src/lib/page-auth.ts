import { redirect } from "next/navigation";
import { identity, AppError } from "./server";
export async function pageIdentity() {
  try {
    return await identity();
  } catch (e) {
    if (e instanceof AppError && e.status === 401) redirect("/login");
    if (e instanceof AppError && e.status === 503) redirect("/configuracao");
    throw e;
  }
}
