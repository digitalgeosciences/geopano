export interface Annotation {
  kind: "point" | "line" | "polygon";
  title: string;
  yaw: number;
  pitch: number;
  author: string;
  added: string;
  body: string;
}

export interface Stop {
  id: string;
  title: string;
  ll: [number, number];
  lat: string;
  lon: string;
  blurb: string;
  panorama: string | null;
  annotations: Annotation[];
}

export interface Path {
  id: string;
  name: string;
  city: string;
  bg: string;
  stops: Stop[];
}

export interface LibraryItem {
  id: string;
  title: string;
  country: string;
  cat: string;
  notes: number;
  pathName: string;
  blurb: string;
  bg: string;
  stopId: string | null;
  pathId: string | null;
  hasImage: boolean;
}

export type View = "landing" | "map" | "library" | "stop" | "signup" | "about" | "terms" | "privacy";

declare global {
  interface Window {
    pannellum: {
      viewer: (
        container: HTMLElement,
        config: Record<string, unknown>
      ) => { destroy: () => void; getYaw: () => number; getPitch: () => number; getHfov: () => number };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}
