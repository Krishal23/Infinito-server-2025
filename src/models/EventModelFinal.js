import mongoose from "mongoose";


// -------------------- Common Sub-Schemas --------------------
const teamMemberSchema = new mongoose.Schema({
  fullname: String,
  email: { type: String, trim: true, lowercase: true },
  phoneNumber: String,
  aadharId: String,
  rollNo: String,
  position: String,
  role: String,
  skillLevel: String,
}, { _id: false });

const coachSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  phoneNumber: String,
  aadharId: String,
}, { _id: false });

const paymentSchema = {
  paymentStatus: { type: String, enum: ["pending","paid","failed","refunded"], default: "pending" },
  paymentOrderId: String,
  paymentId: String,
  paymentSignature: String,
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  registrationDate: { type: Date, default: Date.now },
  proofString: { type: String, default: "" },

};

const collegeSchema = {
  collegeName: String,
  collegeAddress: String,
};



// -------------------- Factory for Team Sports --------------------
function createTeamSportSchema({ withViceCaptain = true, withSubstitutes = false, categoryRequired = true } = {}) {
  const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ...(categoryRequired ? { category: { type: String, enum: ["Men", "Women"], required: true } } : {}),
    ...collegeSchema,
    captain: { type: teamMemberSchema},
    ...(withViceCaptain ? { viceCaptain: { type: teamMemberSchema, required: true } } : {}),
    players: [teamMemberSchema],
    ...(withSubstitutes ? { substitutes: [teamMemberSchema] } : {}),
    coach: coachSchema,
    ...paymentSchema,
  }, { timestamps: true });
  return schema;
}





// -------------------- Athletics (special case) --------------------
const athleticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ...collegeSchema,
  lead: { type: teamMemberSchema, required: true },
  category: { type: String, enum: ["men", "women"], required: true },
  coach: coachSchema,
  individualEvents: [String],
  relayTeams: [{ teamName: String, members: [teamMemberSchema] }],
  ...paymentSchema,
}, { timestamps: true });

// -------------------- Esports --------------------
const esportsPlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  ...collegeSchema,
  contactNumber: String,
  aadharId: { type: String, required: true },
  ign: { type: String }
}, { _id: false });






function createEsportsSchema(gameName) {
  return new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    teamName: { type: String, required: true },
    teamLeader: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      contactNumber: String,
      aadharId: { type: String, required: true },
      ign: { type: String, required: true },
      ...collegeSchema,
    },
    players: [esportsPlayerSchema],
    queries: { type: String, maxlength: 500 },
    ...paymentSchema,
  }, { timestamps: true });
}




// -------------------- Models --------------------
export const EVENT_MODELS = {
  athletics: mongoose.model("AthleticsRegistration", athleticsSchema),
  badminton: mongoose.model("BadmintonRegistration", createTeamSportSchema({ withViceCaptain: true })),
  basketball: mongoose.model("BasketballRegistration", createTeamSportSchema({ withViceCaptain: true, withSubstitutes: true })),
  chess: mongoose.model("ChessRegistration", createTeamSportSchema({ withViceCaptain: false })),
  cricket: mongoose.model("CricketRegistration", createTeamSportSchema({ withViceCaptain: true })),
  football: mongoose.model("FootballRegistration", createTeamSportSchema({ withViceCaptain: true })),
  kabaddi: mongoose.model("KabaddiRegistration", createTeamSportSchema({ withViceCaptain: true, withSubstitutes: true })),
  lawn_tennis: mongoose.model("LawnTennisRegistration", createTeamSportSchema({ withViceCaptain: false })),
  squash: mongoose.model("SquashRegistration", createTeamSportSchema({ withViceCaptain: false })),
  table_tennis: mongoose.model("TableTennisRegistration", createTeamSportSchema({ withViceCaptain: false })),
  volleyball: mongoose.model("VolleyballRegistration", createTeamSportSchema({ withViceCaptain: true, withSubstitutes: true })),
  weight_lifting: mongoose.model("WeightLiftingRegistration", createTeamSportSchema({ withViceCaptain: false, categoryRequired: false })),
  power_lifting: mongoose.model("PowerLiftingRegistration", createTeamSportSchema({ withViceCaptain: false, categoryRequired: false })),
  bgmi: mongoose.model("BGMIRegistration", createEsportsSchema("BGMI")),
  freefire: mongoose.model("FreeFireRegistration", createEsportsSchema("FreeFire")),
  codm: mongoose.model("CODMRegistration", createEsportsSchema("CODM")),
  valorant: mongoose.model("ValorantRegistration", createEsportsSchema("Valorant")),
  clash_royale: mongoose.model("ClashRoyaleRegistration", createEsportsSchema("ClashRoyale")),
};