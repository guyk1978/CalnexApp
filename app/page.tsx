import { redirect } from "next/navigation";

/** App home — static site uses /index.html; Next dev lands on the tools hub. */
export default function HomePage() {
  redirect("/tools/rent-vs-buy/");
}
