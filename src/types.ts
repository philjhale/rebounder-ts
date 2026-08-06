export type Colour = 'Orange' | 'Blue' | 'Green' | 'Purple' | 'None';

export interface Vec2 {
  x: number;
  y: number;
}

export interface LauncherData {
  position: Vec2;
  colour: Colour;
  enabled: boolean;
}

export interface TargetData {
  position: Vec2;
  colour: Colour;
}

export interface ObstacleData {
  position: Vec2;
  width: number;
  height: number;
}

export interface TeleporterData {
  position: Vec2;
  pairId: string;
}

export interface ColourChangerData {
  position: Vec2;
  colour: Colour;
}

export interface LineCounts {
  Orange: number;
  Blue: number;
  Green: number;
  Purple: number;
}

export interface Level {
  id: string;
  name: string;
  launchers: LauncherData[];
  targets: TargetData[];
  obstacles: ObstacleData[];
  teleporters: TeleporterData[];
  colourChangers: ColourChangerData[];
  lineCounts: LineCounts;
}
