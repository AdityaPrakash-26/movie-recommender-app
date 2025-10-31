import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export async function loader({}: LoaderFunctionArgs) {
  return redirect("/api/auth/login?signup=1");
}

export default function RegisterRedirect() {
  return null;
}
