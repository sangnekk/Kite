/**
 * The page-wide canvas atmosphere: an infinite dot grid plus a few slow,
 * blurred glow blobs in the brand orange and a couple of node accent colors.
 * Rendered once behind everything (z-index negative inside .home-canvas).
 */
export default function HomeBackdrop() {
  return (
    <>
      <div className="home-grid" aria-hidden />

      {/* Hero — big warm orange light bleeding from upper right. */}
      <div
        className="home-glow home-glow--orange"
        aria-hidden
        style={{
          top: "-180px",
          right: "-120px",
          width: "640px",
          height: "640px",
        }}
      />

      {/* A cool counterpoint low-left so the palette isn't monochrome. */}
      <div
        className="home-glow home-glow--blue"
        aria-hidden
        style={{
          top: "44%",
          left: "-200px",
          width: "520px",
          height: "520px",
          animationDelay: "1.5s",
        }}
      />

      {/* Violet near the bottom to warm up the CTA region. */}
      <div
        className="home-glow home-glow--violet"
        aria-hidden
        style={{
          bottom: "2%",
          right: "-160px",
          width: "560px",
          height: "560px",
          animationDelay: "3s",
        }}
      />
    </>
  );
}
