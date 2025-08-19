export const metadata = {
  title: "Contact — Portfolio",
  description: "Get in touch",
};

export default function ContactPage() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl tracking-tight">Contact</h1>
        <p className="opacity-70">
          For commissions, collaborations, and prints.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-sm uppercase tracking-wide opacity-60">Direct</h2>
          <ul className="space-y-2">
            {/* TODO: replace with your real details */}
            <li>
              <span className="opacity-60 mr-2">Email:</span>
              <a className="hover:underline" href="mailto:you@example.com">
                you@example.com
              </a>
            </li>
            <li>
              <span className="opacity-60 mr-2">Phone:</span>
              <a className="hover:underline" href="tel:+1234567890">
                +1 234 567 890
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm uppercase tracking-wide opacity-60">Social</h2>
          <ul className="space-y-2">
            <li>
              <span className="opacity-60 mr-2">Instagram:</span>
              <a
                className="hover:underline"
                href="https://instagram.com/yourhandle"
                target="_blank"
                rel="noreferrer"
              >
                @yourhandle
              </a>
            </li>
            <li>
              <span className="opacity-60 mr-2">Website:</span>
              <a
                className="hover:underline"
                href="https://yourdomain.com"
                target="_blank"
                rel="noreferrer"
              >
                yourdomain.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <p className="small-muted">
        Prefer email for bookings. I usually reply within 24 hours.
      </p>
    </section>
  );
}
