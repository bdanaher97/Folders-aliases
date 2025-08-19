// File: app/motion/page.tsx
import Link from "next/link";
import Image from "next/image";
import { videos } from "./videos";

export default function MotionPage() {
  const hasVideos = videos.length > 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-medium">Motion</h1>
        <p className="small-muted mt-2">Short reels & animation.</p>
      </header>

      {!hasVideos ? (
        <div className="opacity-70">
          No videos yet. Add Blob URLs in <code>app/motion/videos.ts</code>.
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v, i) => (
            <li key={i} className="group">
              <figure className="rounded-2xl overflow-hidden ring-1 ring-black/5 bg-black/5">
                {/* Poster fallback */}
                {v.poster ? (
                  <div className="relative aspect-video">
                    <Image
                      src={v.poster}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-black/10" />
                )}

                <video
                  className="w-full aspect-video block"
                  controls
                  preload="none"
                  playsInline
                  poster={v.poster}
                  controlsList="nodownload noplaybackrate"
                >
                  <source src={v.src} type="video/mp4" />
                </video>
              </figure>

              <figcaption className="mt-2 flex items-center justify-between">
                <span className="truncate">{v.title}</span>
                {v.duration && (
                  <span className="small-muted ml-3 shrink-0">
                    {v.duration}
                  </span>
                )}
              </figcaption>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <Link href="/portfolio" className="underline">
          Back to stills
        </Link>
      </div>
    </main>
  );
}
