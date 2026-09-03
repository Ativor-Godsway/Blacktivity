/**
 * THE ROSTER LIVES HERE — not in the database.
 *
 * To add, remove or reorder a creative, edit this file and redeploy.
 * `photo` should be a portrait-orientation image (3:4). Swap the Unsplash
 * placeholders for real work by replacing the `photo` strings only.
 */
export type TeamMember = {
  name: string;
  role: string;
  igHandle: string;
  photo: string;
  bio?: string;
};

export const TEAM: TeamMember[] = [
  {
    name: "Kwame Asare-Boadu",
    role: "Creative Director",
    igHandle: "kwame.ab",
    photo: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=1200&h=1600&fit=crop",
    bio: "Founded Blacktivity in 2025 to give Ghanaian image-makers a room of their own.",
  },
  {
    name: "Ama Serwaa Mensah",
    role: "Photographer",
    igHandle: "amaserwaa.shoots",
    photo: "https://images.unsplash.com/photo-1503104834685-7205e8607eb9?w=1200&h=1600&fit=crop",
    bio: "Shoots on film. Interested in the ordinary dignity of Accra afternoons.",
  },
  {
    name: "Nii Adjetey Quaye",
    role: "Art Director",
    igHandle: "niiadjetey",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200&h=1600&fit=crop",
    bio: "Type, grids, and the argument that layout is a form of respect.",
  },
  {
    name: "Efua Danso",
    role: "Stylist",
    igHandle: "efua.styles",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200&h=1600&fit=crop",
    bio: "Builds looks out of archive kente, thrift denim and whatever the market gives her.",
  },
  {
    name: "Selorm Agbeko",
    role: "Editor",
    igHandle: "selorm.writes",
    photo: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=1200&h=1600&fit=crop",
    bio: "Runs the Voices column. Believes an interview is a form of care.",
  },
  {
    name: "Yaa Owusu-Ansah",
    role: "Producer",
    igHandle: "yaa.produces",
    photo: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=1200&h=1600&fit=crop",
    bio: "Makes the calls, books the room, and keeps every shoot on the day.",
  },
];

export default TEAM;
