export interface Hotel {
  id: string;
  name: string;
  /** Short name used in tabs and tight columns. */
  shortName: string;
  district: string;
  stars: 3 | 4 | 5;
  rooms: number;
  /** What the hotel sells beyond its rooms, in the words guests see. */
  facilities: string[];
}
