import Head from "next/head";

export default function BaseLayout({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Head>
        <title key="title">
          {`Vibe Bot | ${title ?? "Tạo Bot Discord miễn phí"}`}
        </title>
        <meta
          name="description"
          key="description"
          content={
            description ||
            "Vibe Bot - Tạo Bot Discord miễn phí mà không cần viết code."
          }
        />
        <meta property="og:site_name" key="og:site_name" content="kite.onl" />
        <meta property="og:image" key="og:site_name" content="/logo.png" />
      </Head>

      {children}
    </>
  );
}
