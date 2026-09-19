// /quran/browse/go — form target that redirects to /quran/page/[page] after
// validating the requested page. Keeps the browse form working with plain HTML
// (no JS, works with any browser).

import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; juz?: string; hizb?: string; ruku?: string }>;
};

export default async function GoPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const prefix = locale === "en" ? "" : `/${locale}`;
  const page = Number.parseInt(sp.page ?? "", 10);
  const juz = Number.parseInt(sp.juz ?? "", 10);
  const hizb = Number.parseInt(sp.hizb ?? "", 10);
  const ruku = Number.parseInt(sp.ruku ?? "", 10);

  if (Number.isInteger(page) && page >= 1 && page <= 604) {
    redirect(`${prefix}/quran/page/${page}`);
  }
  if (Number.isInteger(juz) && juz >= 1 && juz <= 30) {
    redirect(`${prefix}/quran/juz/${juz}`);
  }
  if (Number.isInteger(hizb) && hizb >= 1 && hizb <= 60) {
    redirect(`${prefix}/quran/hizb/${hizb}`);
  }
  if (Number.isInteger(ruku) && ruku >= 1 && ruku <= 558) {
    redirect(`${prefix}/quran/ruku/${ruku}`);
  }
  redirect(`${prefix}/quran/browse`);
}
