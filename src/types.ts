export interface Annotation {
  kind: "point" | "line" | "polygon";
  title: string;
  yaw: number;
  pitch: number;
  author: string;
  added: string;
  body: string;
  tags?: string[];
  color?: string;
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
  tags?: string[];
  defaultYaw?: number;
  defaultPitch?: number;
}

export interface Path {
  id: string;
  name: string;
  city: string;
  bg: string;
  stops: Stop[];
  tags?: string[];
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
  tags?: string[];
}

export type View = "landing" | "map" | "library" | "stop" | "signup" | "about" | "terms" | "privacy";

declare global {
  interface Window {
    pannellum: {
      viewer: (
        container: HTMLElement,
        config: Record<string, unknown>
      ) => {
        destroy: () => void;
        getYaw: () => number;
        getPitch: () => number;
        getHfov: () => number;
        setYaw: (yaw: number, animated?: boolean) => void;
        setPitch: (pitch: number, animated?: boolean) => void;
        startAutoRotate: (speed: number) => void;
        stopAutoRotate: () => void;
      };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}
