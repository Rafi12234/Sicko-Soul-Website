/** Voice per docs/BRAND_BIBLE.md: cold, blunt, exclusionary. No exclamations. */

export const LOOKBOOK_COPY = {
  eyebrow: "05 / THE LOOKBOOK",
  aside: "NO STUDIO. NO PERMIT. NO SECOND TAKE.",
  hint: "HOVER TO HOLD THE FRAME. TAP TO MARK IT.",
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
  /** A short one-line reveal for the reverse side of the 3D glass card. */
  reveal: string;
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
    src: "https://res.cloudinary.com/dec82taov/image/upload/v1791627266/WhatsApp_Image_2026-10-10_at_4.08.03_PM_acqwjo.jpg",
    alt: "Caught on Camera photograph 01",
    title: "UNDER WATCH",
    spec: "CAM 01 · 03:41",
    line: "Everyone moved. He didn't.",
    reveal: "YOU SAW NOTHING.",
    width: "w-[76vw]",
    height: "md:h-[46vh]",
    offset: "md:mt-0",
    aspect: "aspect-[3/4]",
  },
  {
    id: "boot",
    index: "02",
    src: "https://res.cloudinary.com/dec82taov/image/upload/v1791627266/WhatsApp_Image_2026-10-10_at_4.08.02_PM_2_oygkqw.jpg",
    alt: "Caught on Camera photograph 02",
    title: "THE HANDOFF",
    spec: "NO PLATE · NO NAMES",
    line: "Nothing in that boot was yours.",
    reveal: "NO NAMES. NO MERCY.",
    width: "w-[70vw]",
    height: "md:h-[38vh]",
    offset: "md:mt-[10vh]",
    aspect: "aspect-[4/5]",
  },
  {
    id: "rollcall",
    index: "03",
    src: "https://res.cloudinary.com/dec82taov/image/upload/v1791627266/WhatsApp_Image_2026-10-10_at_4.08.03_PM_2_p279qj.jpg",
    alt: "Caught on Camera photograph 03",
    title: "ROLL CALL",
    spec: "BLOCK 09 · DUSK",
    line: "Four backs. One direction.",
    reveal: "ONE STREET. NO RULES.",
    width: "w-[80vw]",
    height: "md:h-[42vh]",
    offset: "md:mt-[4vh]",
    aspect: "aspect-[16/11]",
  },
  {
    id: "deck",
    index: "04",
    src: "https://res.cloudinary.com/dec82taov/image/upload/v1791627266/WhatsApp_Image_2026-10-10_at_4.08.02_PM_1_as6ewm.jpg",
    alt: "Caught on Camera photograph 04",
    title: "LOWER DECK",
    spec: "LEVEL -2 · 01:12",
    line: "The cameras down here point at the wall.",
    reveal: "THE NIGHT KNOWS.",
    width: "w-[68vw]",
    height: "md:h-[36vh]",
    offset: "md:mt-[14vh]",
    aspect: "aspect-[3/4]",
  },
  {
    id: "stairwell",
    index: "05",
    src: "https://res.cloudinary.com/dec82taov/image/upload/v1791627266/WhatsApp_Image_2026-10-10_at_4.08.02_PM_hckhnv.jpg",
    alt: "Caught on Camera photograph 05",
    title: "THE STAIRWELL",
    spec: "NO EXIT · 03:40",
    line: "Where the whole thing started.",
    reveal: "NO WAY BACK.",
    width: "w-[74vw]",
    height: "md:h-[47vh]",
    offset: "md:mt-[3vh]",
    aspect: "aspect-[3/4]",
  },
  {
    id: "kerb",
    index: "06",
    src: "https://res.cloudinary.com/dec82taov/image/upload/v1791627267/WhatsApp_Image_2026-10-10_at_4.08.01_PM_1_jiasfu.jpg",
    alt: "Caught on Camera photograph 06",
    title: "OFF THE KERB",
    spec: "DROP SHOULDER · WORN",
    line: "Cut wrong on purpose. Still fits better than yours.",
    reveal: "NOT BUILT TO FIT IN.",
    width: "w-[70vw]",
    height: "md:h-[41vh]",
    offset: "md:mt-[11vh]",
    aspect: "aspect-[4/5]",
  },
  {
    id: "wall",
    index: "07",
    src: "https://res.cloudinary.com/dec82taov/image/upload/v1791627267/WhatsApp_Image_2026-10-10_at_4.08.01_PM_glj3dy.jpg",
    alt: "Caught on Camera photograph 07",
    title: "AGAINST THE WALL",
    spec: "NO RETOUCH · DAYLIGHT",
    line: "Nothing here was fixed in post.",
    reveal: "THE WALLS REMEMBER.",
    width: "w-[76vw]",
    height: "md:h-[44vh]",
    offset: "md:mt-0",
    aspect: "aspect-[3/4]",
  },
  {
    id: "lastframe",
    index: "08",
    src: "https://res.cloudinary.com/dec82taov/image/upload/v1791627266/WhatsApp_Image_2026-10-10_at_4.08.03_PM_1_g8hwxl.jpg",
    alt: "Caught on Camera photograph 08",
    title: "LAST FRAME",
    spec: "ROLL ENDS · 04:02",
    line: "He left before anyone asked a name.",
    reveal: "NEVER LOOK BACK.",
    width: "w-[66vw]",
    height: "md:h-[38vh]",
    offset: "md:mt-[15vh]",
    aspect: "aspect-[4/5]",
  },
];
