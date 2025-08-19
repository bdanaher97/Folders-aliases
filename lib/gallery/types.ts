export type GalleryNode = {
  name: string;
  slug: string;
  fsPath: string;
  webPath: string;
  coverWebPath?: string;
  images?: string[];
  children?: GalleryNode[];
};
