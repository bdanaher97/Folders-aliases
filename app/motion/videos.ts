// File: app/motion/videos.ts
export type MotionClip = {
  title: string;
  src: string; // Vercel Blob public URL to .mp4 (or .webm)
  poster?: string; // optional poster in /public (recommended)
  duration?: string; // optional display label, e.g. "0:28"
};

export const videos: MotionClip[] = [
  // Example:
  // {
  //   title: "Product reel 01",
  //   src: "https://<acct>.public.blob.vercel-storage.com/motion/reel01.mp4",
  //   poster: "/placeholder.png",
  //   duration: "0:23",
  // },
];
