export default function AboutPage() {
  return (
    <div className="container-max py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">About</h1>
      </header>

      <main className="max-w-2xl space-y-5 text-sm text-neutral-800">
        <p>
          The Boring Newspaper is a Burmese-first headline aggregator for people who want to stay informed about Myanmar—without the constant urgency, noise, or doom-scrolling. It brings headlines from a range of local and international outlets into one clean place.
        </p>

        <p>
          When you click a headline, you go directly to the original publisher’s website to read the full story in its original context. This project is an MVP and will evolve over time based on feedback.
        </p>

        <p className="pt-4">
          <a className="text-neutral-600 no-underline hover:underline" href="/">
            ← Back to home
          </a>
        </p>
      </main>
    </div>
  );
}
