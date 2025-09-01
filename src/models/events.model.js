import mongoose from "mongoose";

// -------------------- Validation Helpers --------------------
const validateAadhar = v => /^\d{12}$/.test(v);
const validatePhone = v => /^\d{10}$/.test(v);

// Centralized team size rules
const TEAM_LIMITS = {
    basketball: { min: 5, max: 12 },
    cricket: { min: 11, max: 16 },
    football: { min: 11, max: 16 },
    kabaddi: { min: 7, max: 10 },
    volleyball: { min: 6, max: 12 },
    chess: { min: 1, max: 2 },
    badminton: { min: 1, max: 2 },
    table_tennis: { min: 1, max: 2 },
    lawn_tennis: { min: 1, max: 2 },
    squash: { min: 1, max: 1 },
    weight_lifting: { min: 1, max: 1 },
    athletics: { min: 1, max: 1 }
  };

// -------------------- Common Base Fields --------------------
const baseEventFields = {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    aadharId: {
      type: String,
      trim: true,
      required: [true, "Aadhar ID is required"],
      validate: { validator: validateAadhar, message: "Aadhar ID must be 12 digits" }
    },
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      validate: { validator: validatePhone, message: "Phone number must be 10 digits" }
    },
    collegeName: { type: String, required: true, trim: true },
    rollNo: { type: String, trim: true },
  
    // Registration meta
    registrationDate: { type: Date, default: Date.now },
  
    // Payment quick refs
    paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
    paymentOrderId: { type: String, trim: true },
    paymentId:      { type: String, trim: true },
    paymentSignature:{ type: String, trim: true },
  
    // Reference to central Transaction table
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  
    registrationFee: { type: Number, default: 0 },
  };
  

// -------------------- Team Member Schema --------------------
const teamMemberSchema = new mongoose.Schema({
  fullname: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phoneNumber: { type: String, required: true, trim: true },
  aadharId: { type: String, required: true, trim: true },
  rollNo: String,
  position: String,
  role: { type: String, enum: ["Captain", "Vice Captain", "Player"], required: true },
  skillLevel: { type: String, enum: ["beginner","intermediate","advanced","professional"] }
}, { _id: false });

// -------------------- Team Schema --------------------
const teamSchema = new mongoose.Schema({
  teamName: String,
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [teamMemberSchema],
}, { _id: false });

// -------------------- Schema Factory --------------------
function createSchema(fields, uniqueByUser = true) {
  const schema = new mongoose.Schema(
    { ...baseEventFields, ...fields },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
  );
  if (uniqueByUser) schema.index({ userId: 1 }, { unique: true });
  return schema;
}

// -------------------- Event Schemas --------------------

// 1. Athletics
const athleticsSchema = createSchema({
  events: [{ type: String, enum: ["100m","200m","400m","800m","1500m","5000m","long_jump","high_jump","javelin_throw"], required: true }],
  category: { type: String, enum: ["men","women"], required: true },
  coachName: String
});

// 2. Badminton
const badmintonSchema = createSchema({
  category: { type: String, enum: ["men_singles","women_singles","men_doubles","women_doubles","mixed_doubles"] },
  partnerDetails: { name: String, email: String, phoneNumber: String, collegeName: String, rollNo: String },
  skillLevel: { type: String, enum: ["beginner","intermediate","advanced","professional"] }
});

// 3. Basketball
const basketballSchema = createSchema({
  category: { type: String, enum: ["men","women"], required: true },
  position: { type: String, enum: ["point_guard","shooting_guard","center","any"], required: true },
  height: { type: String, required: true },
  experience: { type: String, enum: ["beginner","intermediate","advanced","professional"], required: true },
  team: teamSchema
});

// 4. Chess
const chessSchema = createSchema({
  category: { type: String, enum: ["open","women","under_18","under_16"], required: true },
  fideRating: { type: Number, min: 0, max: 3000 },
  onlineRatings: {
    chesscom: { username: String, rating: Number },
    lichess: { username: String, rating: Number }
  },
  experience: { type: String, enum: ["beginner","club_player","tournament_player","expert","master"], required: true },
  preferredTimeControl: { type: String, enum: ["blitz","rapid","classical"], required: true }
});

// 5. Cricket
const cricketSchema = createSchema({
  category: { type: String, enum: ["men","women"], required: true },
  role: { type: String, enum: ["batsman","bowler","wicket_keeper","all_rounder"], required: true },
  battingStyle: { type: String, enum: ["right_handed","left_handed"] },
  team: teamSchema
});

// 6. Football
const footballSchema = createSchema({
  category: { type: String, enum: ["men","women"], required: true },
  position: { type: String, enum: ["goalkeeper","defender","midfielder","forward","any"], required: true },
  experience: { type: String, enum: ["beginner","intermediate","advanced","professional"], required: true },
  team: teamSchema
});

// 7. Kabaddi
const kabaddiSchema = createSchema({
  category: { type: String, enum: ["men","women"], required: true },
  height: { type: String, required: true },
  position: { type: String, enum: ["raider","defender","all_rounder"], required: true },
  experience: { type: String, enum: ["beginner","intermediate","advanced","professional"], required: true },
  jerseySize: { type: String, enum: ["XS","S","M","L","XL","XXL"], required: true },
  team: teamSchema
});

// 8. Lawn Tennis
const lawnTennisSchema = createSchema({
  category: { type: String, enum: ["men_singles","women_singles","men_doubles","women_doubles","mixed_doubles"], required: true },
  partnerDetails: { name: String, email: String, phoneNumber: String, collegeName: String, rollNo: String },
  skillLevel: { type: String, enum: ["beginner","intermediate","advanced","professional"], required: true },
  playingHand: { type: String, enum: ["right","left","ambidextrous"], required: true }
});

// 9. Squash
const squashSchema = createSchema({
  category: { type: String, enum: ["men","women"], required: true },
  skillLevel: { type: String, enum: ["beginner","intermediate","advanced","professional"], required: true },
  playingHand: { type: String, enum: ["right","left","ambidextrous"], required: true }
});

// 10. Table Tennis
const tableTennisSchema = createSchema({
  category: { type: String, enum: ["men_singles","women_singles","men_doubles","women_doubles","mixed_doubles"], required: true },
  partnerDetails: { name: String, email: String, phoneNumber: String, collegeName: String, rollNo: String },
  skillLevel: { type: String, enum: ["beginner","intermediate","advanced","professional"], required: true },
  playingStyle: { type: String, enum: ["offensive","defensive","all_round","counter_attack"] }
});

// 11. Volleyball
const volleyballSchema = createSchema({
  category: { type: String, enum: ["men","women"], required: true },
  position: { type: String, enum: ["setter","outside_hitter","middle_blocker","opposite","libero","universal"], required: true },
  height: { type: String, required: true },
  experience: { type: String, enum: ["beginner","intermediate","advanced","professional"], required: true },
  team: teamSchema
});

// 12. Weight Lifting
const weightLiftingSchema = createSchema({
  category: { type: String, enum: ["men","women"], required: true },
  competitionType: { type: String, enum: ["powerlifting","olympic_weightlifting","bodybuilding"], required: true },
  weightCategory: { type: String, enum: ["under_55","55_61","61_67","67_73","73_81","81_96","96_109","over_109"], required: true },
  currentWeight: { type: Number, min: 30, max: 200, required: true },
  events: [{ type: String, enum: ["squat","bench_press","deadlift","snatch","clean_jerk"], required: true }],
  personalBest: { squat: Number, bench_press: Number, deadlift: Number, snatch: Number, clean_jerk: Number },
  experience: { type: String, enum: ["beginner","intermediate","advanced","professional"], required: true }
});

// 13. CODM (Esports)
const codmSchema = createSchema({
  teamName: { type: String, required: true },
  teamLeaderName: { type: String, required: true },
  teamLeaderRollNo: { type: String, required: true },
  teamCaptainNumber: { 
    type: String, required: true,
    validate: { validator: v => /^\d{10}$/.test(v), message: "Must be 10 digits" }
  },
  players: [{ name: String, rollNumber: String, ign: String }],
  collegeAddress: { type: String, required: true },
  queries: { type: String, maxlength: 500 },
  team: teamSchema
});
codmSchema.pre("validate", function(next) {
  if (!this.players || this.players.length !== 5) {
    this.invalidate("players", "CODM team must have exactly 5 players");
  }
  next();
});

// -------------------- Exports --------------------
export const AthleticsRegistration = mongoose.model("AthleticsRegistration", athleticsSchema);
export const BadmintonRegistration = mongoose.model("BadmintonRegistration", badmintonSchema);
export const BasketballRegistration = mongoose.model("BasketballRegistration", basketballSchema);
export const ChessRegistration = mongoose.model("ChessRegistration", chessSchema);
export const CricketRegistration = mongoose.model("CricketRegistration", cricketSchema);
export const FootballRegistration = mongoose.model("FootballRegistration", footballSchema);
export const KabaddiRegistration = mongoose.model("KabaddiRegistration", kabaddiSchema);
export const LawnTennisRegistration = mongoose.model("LawnTennisRegistration", lawnTennisSchema);
export const SquashRegistration = mongoose.model("SquashRegistration", squashSchema);
export const TableTennisRegistration = mongoose.model("TableTennisRegistration", tableTennisSchema);
export const VolleyballRegistration = mongoose.model("VolleyballRegistration", volleyballSchema);
export const WeightLiftingRegistration = mongoose.model("WeightLiftingRegistration", weightLiftingSchema);
export const CODMRegistration = mongoose.model("CODMRegistration", codmSchema);

export const EVENT_MODELS = {
  athletics: AthleticsRegistration,
  badminton: BadmintonRegistration,
  basketball: BasketballRegistration,
  chess: ChessRegistration,
  cricket: CricketRegistration,
  football: FootballRegistration,
  kabaddi: KabaddiRegistration,
  lawn_tennis: LawnTennisRegistration,
  squash: SquashRegistration,
  table_tennis: TableTennisRegistration,
  volleyball: VolleyballRegistration,
  weight_lifting: WeightLiftingRegistration,
  codm: CODMRegistration
};
