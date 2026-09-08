/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const LOOKBOOK_COPY = {
  eyebrow: "05 / THE LOOKBOOK",
  aside: "NO STUDIO. NO PERMIT. NO SECOND TAKE.",
  hint: "KEEP SCROLLING. THE ROOM MOVES SIDEWAYS.",
  heading: "CAUGHT",
  /** Brush script, the same hand that signs the garments. */
  headingScript: "on camera",
  outro: "THAT'S ALL YOU GET TO SEE",
  outroMeta: "THE REST NEVER LEFT THE BLOCK",
} as const;

export type LookbookFrame = {
  id: string;
  index: string;
  src: string;
  alt: string;
  title: string;
  spec: string;
  line: string;
  /** Mobile width; on desktop the frame is sized by height instead. */
  width: string;
  /** Heights and offsets deliberately disagree so the row never reads as
   *  four equal tiles, and together they stay inside one pinned viewport. */
  height: string;
  offset: string;
  aspect: string;
};

export const LOOKBOOK_FRAMES: readonly LookbookFrame[] = [
  {
    id: "watched",
    index: "01",
    src: "/imgs/image_1.jpg",
    alt: "Overhead surveillance frame of a hooded figure standing still in a moving crowd",
    title: "UNDER WATCH",
    spec: "CAM 01 · 03:41",
    line: "Everyone moved. He didn't.",
    width: "w-[76vw]",
    height: "md:h-[46vh]",
    offset: "md:mt-0",
    aspect: "aspect-[3/4]",
  },
  {
    id: "boot",
    index: "02",
    src: "/imgs/image_2.jpg",
    alt: "Two masked figures loading a car boot at dusk",
    title: "THE HANDOFF",
    spec: "NO PLATE · NO NAMES",
    line: "Nothing in that boot was yours.",
    width: "w-[70vw]",
    height: "md:h-[38vh]",
    offset: "md:mt-[10vh]",
    aspect: "aspect-[4/5]",
  },
  {
    id: "rollcall",
    index: "03",
    src: "/imgs/image_3.jpg",
    alt: "Four figures walking a road in graphic tees, shot from above",
    title: "ROLL CALL",
    spec: "BLOCK 09 · DUSK",
    line: "Four backs. One direction.",
    width: "w-[80vw]",
    height: "md:h-[42vh]",
    offset: "md:mt-[4vh]",
    aspect: "aspect-[16/11]",
  },
  {
    id: "deck",
    index: "04",
    src: "/imgs/image_5.jpg",
    alt: "Masked crew standing on a lower parking deck",
    title: "LOWER DECK",
    spec: "LEVEL -2 · 01:12",
    line: "The cameras down here point at the wall.",
    width: "w-[68vw]",
    height: "md:h-[36vh]",
    offset: "md:mt-[14vh]",
    aspect: "aspect-[3/4]",
  },
  {
    id: "stairwell",
    index: "05",
    src: "/imgs/image_4.jpg",
    alt: "Three figures standing on a stairwell at night",
    title: "THE STAIRWELL",
    spec: "NO EXIT · 03:40",
    line: "Where the whole thing started.",
    width: "w-[74vw]",
    height: "md:h-[47vh]",
    offset: "md:mt-[3vh]",
    aspect: "aspect-[3/4]",
  },
  {
    id: "kerb",
    index: "06",
    src: "/imgs/man_dropsholder_1.jpg",
    alt: "Model wearing an oversized drop-shoulder tee on the street",
    title: "OFF THE KERB",
    spec: "DROP SHOULDER · WORN",
    line: "Cut wrong on purpose. Still fits better than yours.",
    width: "w-[70vw]",
    height: "md:h-[41vh]",
    offset: "md:mt-[11vh]",
    aspect: "aspect-[4/5]",
  },
  {
    id: "wall",
    index: "07",
    src: "/imgs/man_shirt_3.png",
    alt: "Model in an open pinstripe shirt against a concrete pillar",
    title: "AGAINST THE WALL",
    spec: "NO RETOUCH · DAYLIGHT",
    line: "Nothing here was fixed in post.",
    width: "w-[76vw]",
    height: "md:h-[44vh]",
    offset: "md:mt-0",
    aspect: "aspect-[3/4]",
  },
  {
    id: "lastframe",
    index: "08",
    src: "/imgs/man_dropsholder_4.jpg",
    alt: "Model in a drop-shoulder tee turning away from the camera",
    title: "LAST FRAME",
    spec: "ROLL ENDS · 04:02",
    line: "He left before anyone asked a name.",
    width: "w-[66vw]",
    height: "md:h-[38vh]",
    offset: "md:mt-[15vh]",
    aspect: "aspect-[4/5]",
  },
];
